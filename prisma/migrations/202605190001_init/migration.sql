CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE revision_goal AS ENUM ('NATURAL', 'CONCISE', 'PROFESSIONAL', 'PERSONAL', 'MATCH_SAMPLES');
CREATE TYPE revision_status AS ENUM ('DRAFT', 'GENERATED', 'REVIEWED', 'FINALIZED');
CREATE TYPE export_type AS ENUM ('FINAL_TEXT', 'TRACKED_DIFF', 'REVISION_SUMMARY', 'TRANSPARENCY_REPORT');
CREATE TYPE export_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETE', 'FAILED');
CREATE TYPE audit_actor_type AS ENUM ('USER', 'SYSTEM');
CREATE TYPE source_type AS ENUM ('PASTED', 'TXT', 'PDF', 'DOCX');
CREATE TYPE diff_decision AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  timezone TEXT DEFAULT 'UTC',
  locale TEXT DEFAULT 'en-US',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE oauth_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_account_id)
);
CREATE INDEX idx_oauth_accounts_user_id ON oauth_accounts(user_id);

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);
CREATE INDEX idx_projects_user_id ON projects(user_id);

CREATE TABLE source_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_type source_type NOT NULL,
  original_filename TEXT,
  storage_key TEXT,
  mime_type TEXT,
  content TEXT NOT NULL,
  checksum TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_source_documents_project_id ON source_documents(project_id);

CREATE TABLE writing_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  source_type source_type NOT NULL,
  original_filename TEXT,
  storage_key TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_writing_samples_user_id ON writing_samples(user_id);

CREATE TABLE voice_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avg_sentence_length DOUBLE PRECISION NOT NULL,
  preferred_transitions TEXT[] NOT NULL DEFAULT '{}',
  tone_markers TEXT[] NOT NULL DEFAULT '{}',
  punctuation_habits JSONB NOT NULL,
  lexical_features JSONB NOT NULL,
  sample_count INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_voice_profiles_user_id ON voice_profiles(user_id);

CREATE TABLE revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  voice_profile_id UUID REFERENCES voice_profiles(id) ON DELETE SET NULL,
  source_document_id UUID NOT NULL REFERENCES source_documents(id) ON DELETE CASCADE,
  parent_revision_id UUID REFERENCES revisions(id) ON DELETE SET NULL,
  goal revision_goal NOT NULL,
  reading_level TEXT NOT NULL,
  tone TEXT NOT NULL,
  formality INTEGER NOT NULL,
  aggressiveness INTEGER NOT NULL,
  preserve_terminology BOOLEAN NOT NULL DEFAULT TRUE,
  preserve_sentence_structure BOOLEAN NOT NULL DEFAULT FALSE,
  preserve_citation BOOLEAN NOT NULL DEFAULT TRUE,
  locked_sentences INTEGER[] NOT NULL DEFAULT '{}',
  locked_terms TEXT[] NOT NULL DEFAULT '{}',
  rewritten_text TEXT NOT NULL,
  option_index INTEGER NOT NULL DEFAULT 1,
  semantic_score DOUBLE PRECISION NOT NULL,
  drift_warnings JSONB NOT NULL,
  status revision_status NOT NULL DEFAULT 'DRAFT',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_revisions_project_id ON revisions(project_id);
CREATE INDEX idx_revisions_user_id ON revisions(user_id);

CREATE TABLE sentence_diffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  revision_id UUID NOT NULL REFERENCES revisions(id) ON DELETE CASCADE,
  sentence_index INTEGER NOT NULL,
  original_sentence TEXT NOT NULL,
  revised_sentence TEXT NOT NULL,
  rationale TEXT NOT NULL,
  semantic_score DOUBLE PRECISION NOT NULL,
  claim_strength_warning BOOLEAN NOT NULL DEFAULT FALSE,
  named_entity_warning BOOLEAN NOT NULL DEFAULT FALSE,
  number_or_date_warning BOOLEAN NOT NULL DEFAULT FALSE,
  citation_warning BOOLEAN NOT NULL DEFAULT FALSE,
  decision diff_decision NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (revision_id, sentence_index)
);
CREATE INDEX idx_sentence_diffs_revision_id ON sentence_diffs(revision_id);

CREATE TABLE transparency_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  revision_id UUID NOT NULL,
  draft_created_at TIMESTAMPTZ NOT NULL,
  rewrite_requested_at TIMESTAMPTZ NOT NULL,
  edit_count INTEGER NOT NULL,
  heavily_changed_sections JSONB NOT NULL,
  used_writing_samples BOOLEAN NOT NULL,
  notes TEXT,
  report_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_transparency_reports_project_id ON transparency_reports(project_id);
CREATE INDEX idx_transparency_reports_user_id ON transparency_reports(user_id);

CREATE TABLE export_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  revision_id UUID,
  report_id UUID,
  export_type export_type NOT NULL,
  status export_status NOT NULL DEFAULT 'PENDING',
  storage_key TEXT,
  signed_url TEXT,
  expires_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_export_jobs_project_id ON export_jobs(project_id);
CREATE INDEX idx_export_jobs_user_id ON export_jobs(user_id);

CREATE TABLE audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  actor_type audit_actor_type NOT NULL,
  event_name TEXT NOT NULL,
  event_payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);
CREATE INDEX idx_audit_events_event_name ON audit_events(event_name);
CREATE INDEX idx_audit_events_created_at ON audit_events(created_at);
