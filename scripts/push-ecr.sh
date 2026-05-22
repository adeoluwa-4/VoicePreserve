#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 3 ]; then
  echo "Usage: scripts/push-ecr.sh <aws-region> <aws-account-id> <image-tag>"
  exit 1
fi

AWS_REGION="$1"
AWS_ACCOUNT_ID="$2"
IMAGE_TAG="$3"
REPO_NAME="voicepreserve-app"
IMAGE_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${REPO_NAME}:${IMAGE_TAG}"

aws ecr describe-repositories --repository-names "$REPO_NAME" --region "$AWS_REGION" >/dev/null 2>&1 || \
  aws ecr create-repository --repository-name "$REPO_NAME" --region "$AWS_REGION" >/dev/null

aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

docker build -t "${REPO_NAME}:${IMAGE_TAG}" .
docker tag "${REPO_NAME}:${IMAGE_TAG}" "$IMAGE_URI"
docker push "$IMAGE_URI"

echo "Pushed image: $IMAGE_URI"
