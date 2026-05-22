output "alb_dns_name" {
  description = "Public ALB URL"
  value       = aws_lb.app.dns_name
}

output "rds_endpoint" {
  description = "Postgres endpoint"
  value       = aws_db_instance.postgres.address
}

output "redis_endpoint" {
  description = "Redis endpoint"
  value       = aws_elasticache_cluster.redis.cache_nodes[0].address
}
