variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "project_name" {
  type    = string
  default = "voicepreserve"
}

variable "environment" {
  type    = string
  default = "prod"
}

variable "vpc_cidr" {
  type    = string
  default = "10.42.0.0/16"
}

variable "public_subnet_cidrs" {
  type    = list(string)
  default = ["10.42.0.0/24", "10.42.1.0/24"]
}

variable "private_subnet_cidrs" {
  type    = list(string)
  default = ["10.42.10.0/24", "10.42.11.0/24"]
}

variable "app_image" {
  type        = string
  description = "ECR image URI for the Next.js app"
}

variable "worker_image" {
  type        = string
  description = "ECR image URI for export worker"
}

variable "database_name" {
  type    = string
  default = "voicepreserve"
}

variable "database_user" {
  type    = string
  default = "voicepreserve"
}

variable "database_password" {
  type      = string
  sensitive = true
}

variable "jwt_secret" {
  type      = string
  sensitive = true
}

variable "csrf_secret" {
  type      = string
  sensitive = true
}

variable "google_client_id" {
  type      = string
  sensitive = true
}

variable "google_client_secret" {
  type      = string
  sensitive = true
}

variable "app_url" {
  type = string
}

variable "desired_count" {
  type    = number
  default = 1
}
