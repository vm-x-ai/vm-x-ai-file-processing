module "landing_s3_bucket" {
  source = "terraform-aws-modules/s3-bucket/aws"

  bucket = "vm-x-ai-${var.service_name}-landing-${data.aws_region.current.name}-${var.stage}"
  acl    = "private"

  versioning = {
    enabled = true
  }
}

module "landing_sns_topic" {
  source = "terraform-aws-modules/sns/aws"

  name = "vm-x-ai-${var.service_name}-${data.aws_region.current.name}-${var.stage}-events"

  subscriptions = {
    temporal = {
      protocol = "http"
      endpoint = "http://172.17.0.1:8000/ingest"
    }
  }
}

module "landing_s3_notification" {
  source = "terraform-aws-modules/s3-bucket/aws//modules/notification"

  bucket = module.landing_s3_bucket.s3_bucket_id

  sns_notifications = {
    sns = {
      topic_arn = module.landing_sns_topic.topic_arn
      events    = ["s3:ObjectCreated:*"]
    }
  }
}
