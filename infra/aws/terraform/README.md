# AWS IaC (Terraform)

This Terraform stack provisions VoicePreserve infrastructure on AWS:

- VPC with public/private subnets
- Application Load Balancer
- ECS Fargate cluster
- App service (Next.js)
- Worker service (BullMQ worker)
- RDS PostgreSQL
- ElastiCache Redis
- CloudWatch log groups

## Prerequisites

- AWS CLI configured
- Terraform >= 1.5
- Docker image pushed to ECR

## Quick start

```bash
cd infra/aws/terraform
cp terraform.tfvars.example terraform.tfvars
# edit terraform.tfvars values
terraform init
terraform plan
terraform apply
```

## Notes

- This is a baseline IaC template and should be reviewed for production hardening:
  - secret management via AWS Secrets Manager or SSM Parameter Store
  - multi-AZ RDS settings and backup policies
  - HTTPS/TLS listener with ACM certificate
  - WAF and stricter network controls
