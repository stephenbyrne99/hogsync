#!/bin/bash
set -e

# HogSync installer script
# Usage: curl -fsSL https://raw.githubusercontent.com/stephenbyrne99/hogsync/main/install.sh | bash

REPO="stephenbyrne99/hogsync"
INSTALL_DIR="$HOME/.hogsync"
BIN_DIR="$INSTALL_DIR/bin"
BINARY_NAME="hogsync"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Detect OS and architecture
detect_platform() {
    local os arch

    # Detect OS
    case "$(uname -s)" in
        Linux*)     os="linux" ;;
        Darwin*)    os="darwin" ;;
        CYGWIN*|MINGW*|MSYS*) os="win32" ;;
        *)          log_error "Unsupported operating system: $(uname -s)"; exit 1 ;;
    esac

    # Detect architecture
    case "$(uname -m)" in
        x86_64|amd64)   arch="x64" ;;
        arm64|aarch64)  arch="arm64" ;;
        *)              log_error "Unsupported architecture: $(uname -m)"; exit 1 ;;
    esac

    echo "${os}-${arch}"
}

# Get the latest release version
get_latest_version() {
    local version
    version=$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" | grep '"tag_name"' | sed -E 's/.*"tag_name": "([^"]+)".*/\1/')
    
    if [ -z "$version" ]; then
        log_error "Failed to get latest version"
        exit 1
    fi
    
    echo "$version"
}

# Download and install binary
install_binary() {
    local platform="$1"
    local version="$2"
    local download_url="https://github.com/${REPO}/releases/download/${version}/hogsync-${platform}.zip"
    local temp_dir
    
    log_info "Installing HogSync ${version} for ${platform}..."
    
    # Create temporary directory
    temp_dir=$(mktemp -d)
    trap "rm -rf $temp_dir" EXIT
    
    # Download the binary
    log_info "Downloading from ${download_url}..."
    if ! curl -fsSL "$download_url" -o "$temp_dir/hogsync.zip"; then
        log_error "Failed to download HogSync binary"
        exit 1
    fi
    
    # Create installation directory
    mkdir -p "$BIN_DIR"
    
    # Extract binary
    log_info "Extracting binary..."
    if command -v unzip >/dev/null 2>&1; then
        unzip -q "$temp_dir/hogsync.zip" -d "$temp_dir"
    else
        log_error "unzip command not found. Please install unzip and try again."
        exit 1
    fi
    
    # Move binary to installation directory
    if [ -f "$temp_dir/hogsync" ]; then
        mv "$temp_dir/hogsync" "$BIN_DIR/hogsync"
        chmod +x "$BIN_DIR/hogsync"
    elif [ -f "$temp_dir/hogsync.exe" ]; then
        mv "$temp_dir/hogsync.exe" "$BIN_DIR/hogsync.exe"
        chmod +x "$BIN_DIR/hogsync.exe"
    else
        log_error "Binary not found in downloaded archive"
        exit 1
    fi
    
    log_success "HogSync installed to $BIN_DIR"
}

# Add to PATH
setup_path() {
    local shell_profile
    local path_export="export PATH=\"\$PATH:$BIN_DIR\""
    
    # Determine shell profile file
    if [ -n "$ZSH_VERSION" ]; then
        shell_profile="$HOME/.zshrc"
    elif [ -n "$BASH_VERSION" ]; then
        if [ -f "$HOME/.bashrc" ]; then
            shell_profile="$HOME/.bashrc"
        else
            shell_profile="$HOME/.bash_profile"
        fi
    else
        shell_profile="$HOME/.profile"
    fi
    
    # Check if PATH is already configured
    if grep -q "$BIN_DIR" "$shell_profile" 2>/dev/null; then
        log_info "PATH already configured in $shell_profile"
    else
        echo "" >> "$shell_profile"
        echo "# HogSync" >> "$shell_profile"
        echo "$path_export" >> "$shell_profile"
        log_success "Added $BIN_DIR to PATH in $shell_profile"
        log_warn "Please restart your shell or run: source $shell_profile"
    fi
    
    # Add to current session PATH
    export PATH="$PATH:$BIN_DIR"
}

# Verify installation
verify_installation() {
    local binary_path="$BIN_DIR/hogsync"
    
    if [ ! -f "$binary_path" ]; then
        binary_path="$BIN_DIR/hogsync.exe"
    fi
    
    if [ -f "$binary_path" ] && [ -x "$binary_path" ]; then
        log_success "Installation verified!"
        log_info "Run 'hogsync --help' to get started"
        
        # Try to run version command
        if "$binary_path" --version >/dev/null 2>&1; then
            local version_output
            version_output=$("$binary_path" --version 2>/dev/null || echo "unknown")
            log_info "Installed version: $version_output"
        fi
    else
        log_error "Installation verification failed"
        exit 1
    fi
}

# Main installation flow
main() {
    log_info "Starting HogSync installation..."
    
    # Check dependencies
    if ! command -v curl >/dev/null 2>&1; then
        log_error "curl is required but not installed"
        exit 1
    fi
    
    if ! command -v unzip >/dev/null 2>&1; then
        log_error "unzip is required but not installed"
        exit 1
    fi
    
    # Detect platform
    local platform
    platform=$(detect_platform)
    log_info "Detected platform: $platform"
    
    # Get latest version
    local version
    version=$(get_latest_version)
    log_info "Latest version: $version"
    
    # Install binary
    install_binary "$platform" "$version"
    
    # Setup PATH
    setup_path
    
    # Verify installation
    verify_installation
    
    log_success "HogSync installation completed!"
}

# Run main function
main "$@"