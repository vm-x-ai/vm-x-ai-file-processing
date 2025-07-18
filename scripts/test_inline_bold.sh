#!/usr/bin/env bash

# Test script for inline bold functionality

# Source shared logging functions
source "$(dirname "$0")/shared/logging.sh"

log_section "Testing Inline Bold Functionality"

log_info_bold_inline "This is a regular message with **bold text** in the middle"
log_success_bold_inline "Success message with **important** information highlighted"
log_error_bold_inline "Error occurred in **critical** component that needs attention"
log_warning_bold_inline "Warning about **deprecated** feature that will be removed"
log_rocket_bold_inline "Launching **production** deployment to live environment"
log_gear_bold_inline "Configuring **database** connection with secure credentials"

log_newline
log_info_bold_inline "You can use **multiple** **bold** **words** in the same message"
log_success_bold_inline "Command: **kubectl get pods** -n **production**"
log_error_bold_inline "Failed to connect to **database** on **port 5432**"

log_newline
log_rocket_bold_inline "All **inline bold** functions are working correctly!" 