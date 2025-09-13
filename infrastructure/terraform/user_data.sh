#!/bin/bash
# User data script for EC2 instances
# This script runs when EC2 instances start up

set -e  # Exit on any error

# Logging
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1
echo "Starting user data script execution at $(date)"

# Update system
yum update -y

# Install Docker
yum install -y docker
systemctl start docker
systemctl enable docker
usermod -a -G docker ec2-user

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose

# Install CloudWatch agent
yum install -y amazon-cloudwatch-agent

# Install AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
./aws/install
rm -rf awscliv2.zip aws

# Create application directory
mkdir -p /opt/app
cd /opt/app

# Create docker-compose.yml for production
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  app:
    image: ${docker_image}
    container_name: ecommerce-app
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      PORT: 3000
      JWT_SECRET: ${jwt_secret}
      MONGODB_URI: ${mongodb_uri}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    logging:
      driver: awslogs
      options:
        awslogs-group: /aws/ec2/${project_name}
        awslogs-region: ${aws_region}
        awslogs-stream-prefix: app
EOF

# Create environment variables file
cat > .env << EOF
NODE_ENV=production
PORT=3000
PROJECT_NAME=${project_name}
ENVIRONMENT=${environment}
AWS_REGION=${aws_region}
EOF

# Create systemd service for the application
cat > /etc/systemd/system/ecommerce-app.service << 'EOF'
[Unit]
Description=E-commerce Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/app
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

# Enable and start the service
systemctl daemon-reload
systemctl enable ecommerce-app.service

# Create log group for CloudWatch
aws logs create-log-group --log-group-name /aws/ec2/${project_name} --region ${aws_region} || true

# Install and configure CloudWatch agent
cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << 'EOF'
{
  "metrics": {
    "namespace": "ECommerce/EC2",
    "metrics_collected": {
      "cpu": {
        "measurement": ["cpu_usage_idle", "cpu_usage_iowait", "cpu_usage_user", "cpu_usage_system"],
        "metrics_collection_interval": 60
      },
      "disk": {
        "measurement": ["used_percent"],
        "metrics_collection_interval": 60,
        "resources": ["*"]
      },
      "diskio": {
        "measurement": ["io_time"],
        "metrics_collection_interval": 60,
        "resources": ["*"]
      },
      "mem": {
        "measurement": ["mem_used_percent"],
        "metrics_collection_interval": 60
      }
    }
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/user-data.log",
            "log_group_name": "/aws/ec2/${project_name}",
            "log_stream_name": "{instance_id}/user-data"
          },
          {
            "file_path": "/var/log/docker",
            "log_group_name": "/aws/ec2/${project_name}",
            "log_stream_name": "{instance_id}/docker"
          }
        ]
      }
    }
  }
}
EOF

# Start CloudWatch agent
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json -s

# Start the application (will be managed by systemd)
systemctl start ecommerce-app.service

# Create health check script
cat > /opt/app/health-check.sh << 'EOF'
#!/bin/bash
# Simple health check script
curl -f http://localhost:3000/health > /dev/null 2>&1
exit $?
EOF

chmod +x /opt/app/health-check.sh

# Setup cron for health monitoring
echo "*/5 * * * * root /opt/app/health-check.sh || systemctl restart ecommerce-app.service" >> /etc/crontab

echo "User data script completed successfully at $(date)"

# Signal that the instance is ready
/opt/aws/bin/cfn-signal -e $? --region ${aws_region} --stack ${project_name} --resource AutoScalingGroup || true