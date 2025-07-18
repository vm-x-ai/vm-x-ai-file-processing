#!/usr/bin/env bash

# Example script demonstrating how to use the shared logging functions

# Source shared logging functions
source "$(dirname "$0")/shared/logging.sh"

# Example usage of different logging functions
log_section "Example Logging Usage"

log_subsection "Basic Logging Functions"
log_info "This is an info message"
log_success "This is a success message"
log_error "This is an error message"
log_warning "This is a warning message"
log_rocket "This is a rocket message"
log_gear "This is a gear message"

log_subsection "Colored Logging Functions"
log_info_colored "This is a colored info message"
log_success_colored "This is a colored success message"
log_error_colored "This is a colored error message"
log_warning_colored "This is a colored warning message"
log_rocket_colored "This is a colored rocket message"
log_gear_colored "This is a colored gear message"

log_subsection "Bold Logging Functions"
log_info_bold "This is a bold info message"
log_success_bold "This is a bold success message"
log_error_bold "This is a bold error message"
log_warning_bold "This is a bold warning message"
log_rocket_bold "This is a bold rocket message"
log_gear_bold "This is a bold gear message"

log_subsection "Inline Bold Text Functions"
log_info_bold_inline "This message has **bold text** in the middle"
log_success_bold_inline "Success with **important** information"
log_error_bold_inline "Error occurred in **critical** component"
log_warning_bold_inline "Warning about **deprecated** feature"
log_rocket_bold_inline "Launching **production** deployment"
log_gear_bold_inline "Configuring **database** connection"

log_subsection "Progress Indicators"
log_progress "Starting installation"
sleep 1
log_progress_success "Installation completed"

log_progress "Starting configuration"
sleep 1
log_progress_error "Configuration failed"

log_subsection "Utility Functions"
log_separator
log_newline
log_info "This message has a newline before it"

log_subsection "Prompt Functions (No Line Break)"
log_prompt "Simple prompt: "
log_prompt_bold_inline "Prompt with **bold** text: "

log_section "Final Section"
log_rocket "Script completed successfully!" 