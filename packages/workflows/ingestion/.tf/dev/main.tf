module "workflow" {
  source       = "../workflow"
  stage        = "dev"
  service_name = "file-classifier"
}
