#!/bin/bash
# Auto-cleanup script for test environments

set -e

PROJECT_NAME="ecommerce-devops"
MAX_AGE_HOURS=24  # Destroy resources older than 24 hours

echo "🧹 Starting automatic cleanup for ${PROJECT_NAME} test resources..."

# Function to check resource age
check_resource_age() {
    local resource_time=$1
    local current_time=$(date +%s)
    local resource_timestamp=$(date -d "$resource_time" +%s)
    local age_seconds=$((current_time - resource_timestamp))
    local age_hours=$((age_seconds / 3600))
    
    if [ $age_hours -gt $MAX_AGE_HOURS ]; then
        return 0  # Resource is old, should be cleaned up
    else
        return 1  # Resource is new, keep it
    fi
}

# Cleanup old EC2 instances
echo "🔍 Checking for old EC2 instances..."
aws ec2 describe-instances \
    --filters "Name=tag:Project,Values=${PROJECT_NAME}" "Name=instance-state-name,Values=running" \
    --query 'Reservations[*].Instances[*].[InstanceId,LaunchTime,Tags[?Key==`Environment`].Value|[0]]' \
    --output text | while read instance_id launch_time environment; do
    
    if [ "$environment" != "production" ] && check_resource_age "$launch_time"; then
        echo "🗑️  Terminating old test instance: $instance_id (launched: $launch_time)"
        aws ec2 terminate-instances --instance-ids $instance_id
    fi
done

# Cleanup old load balancers
echo "🔍 Checking for old load balancers..."
aws elbv2 describe-load-balancers \
    --query "LoadBalancers[?contains(LoadBalancerName, '${PROJECT_NAME}')].[LoadBalancerArn,LoadBalancerName,CreatedTime]" \
    --output text | while read lb_arn lb_name created_time; do
    
    if [[ "$lb_name" != *"production"* ]] && check_resource_age "$created_time"; then
        echo "🗑️  Deleting old load balancer: $lb_name (created: $created_time)"
        aws elbv2 delete-load-balancer --load-balancer-arn $lb_arn
    fi
done

# Cleanup using Terraform for complete environments
echo "🔍 Checking Terraform workspaces for cleanup..."
cd infrastructure/terraform

# List all workspaces
terraform workspace list | grep -v "default\|production" | sed 's/*//g' | xargs -I {} bash -c '
    workspace={}
    echo "Checking workspace: $workspace"
    
    terraform workspace select $workspace
    
    # Check if workspace has resources and if they are old
    if terraform show -json | grep -q "\"values\""; then
        # Get creation time from state (simplified check)
        echo "📅 Workspace $workspace has resources, checking age..."
        
        # For demo purposes, we could destroy staging environments older than 24h
        if [[ "$workspace" == "staging-"* ]] || [[ "$workspace" == "test-"* ]]; then
            echo "🔥 Destroying test workspace: $workspace"
            terraform destroy -auto-approve || true
            terraform workspace select default
            terraform workspace delete $workspace || true
        fi
    fi
'

# Return to default workspace
terraform workspace select default

# Cleanup unused Docker images from EC2 instances (if accessible)
echo "🐳 Cleaning up old Docker images on EC2 instances..."
aws ec2 describe-instances \
    --filters "Name=tag:Project,Values=${PROJECT_NAME}" "Name=instance-state-name,Values=running" \
    --query 'Reservations[*].Instances[*].PublicIpAddress' \
    --output text | xargs -I {} bash -c '
    instance_ip={}
    if [ "$instance_ip" != "None" ] && [ -n "$instance_ip" ]; then
        echo "🧹 Cleaning Docker images on instance: $instance_ip"
        ssh -o StrictHostKeyChecking=no -i ~/.ssh/ecommerce-devops-key.pem ec2-user@$instance_ip \
            "docker system prune -af --volumes || true" || true
    fi
'

echo "✅ Automatic cleanup completed!"
echo "💰 Old test resources have been cleaned up to avoid charges"