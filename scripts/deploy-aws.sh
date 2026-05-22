#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../infra/aws/terraform"

if ! command -v terraform >/dev/null 2>&1; then
  echo "Terraform not installed. Install first: https://developer.hashicorp.com/terraform/install"
  exit 1
fi

echo "Initializing Terraform..."
terraform init

echo "Planning AWS infrastructure..."
terraform plan

echo "Apply when ready: terraform apply"
