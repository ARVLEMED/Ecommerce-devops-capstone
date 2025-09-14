# VPC Outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = aws_vpc.main.cidr_block
}

# Subnet Outputs
output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = aws_subnet.private[*].id
}

# Security Group Outputs
output "alb_security_group_id" {
  description = "ID of the ALB security group"
  value       = aws_security_group.alb.id
}

output "app_security_group_id" {
  description = "ID of the application security group"
  value       = aws_security_group.app.id
}

# Load Balancer Outputs
output "load_balancer_dns" {
  description = "DNS name of the load balancer"
  value       = aws_lb.main.dns_name
}

output "load_balancer_zone_id" {
  description = "Zone ID of the load balancer"
  value       = aws_lb.main.zone_id
}

output "load_balancer_url" {
  description = "URL of the load balancer"
  value       = "http://${aws_lb.main.dns_name}"
}

# Auto Scaling Group Outputs
output "autoscaling_group_name" {
  description = "Name of the Auto Scaling Group"
  value       = aws_autoscaling_group.app.name
}

output "autoscaling_group_arn" {
  description = "ARN of the Auto Scaling Group"
  value       = aws_autoscaling_group.app.arn
}

# S3 Outputs
output "s3_bucket_name" {
  description = "Name of the S3 bucket"
  value       = aws_s3_bucket.assets.bucket
}

output "s3_bucket_domain_name" {
  description = "Domain name of the S3 bucket"
  value       = aws_s3_bucket.assets.bucket_domain_name
}

output "s3_bucket_url" {
  description = "URL of the S3 bucket"
  value       = "https://${aws_s3_bucket.assets.bucket_domain_name}"
}

# Instance Information
output "launch_template_id" {
  description = "ID of the launch template"
  value       = aws_launch_template.app.id
}

output "target_group_arn" {
  description = "ARN of the target group"
  value       = aws_lb_target_group.app.arn
}

# Useful commands
output "ssh_command" {
  description = "Command to SSH into instances (update with actual instance IP)"
  value       = "aws ec2 describe-instances --filters 'Name=tag:Name,Values=${var.project_name}-instance' --query 'Reservations[*].Instances[*].PublicIpAddress' --output text | xargs -I {} ssh -i ~/.ssh/${var.key_pair_name}.pem ec2-user@{}"
}

output "deployment_info" {
  description = "Information about the deployment"
  value = {
    environment = var.environment
    region      = var.aws_region
    app_url     = "http://${aws_lb.main.dns_name}"
    s3_bucket   = aws_s3_bucket.assets.bucket
  }
}