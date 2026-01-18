#!/bin/sh
# Ralph Vibe Installer
# Usage: curl -fsSL https://raw.githubusercontent.com/whatiskadudoing/ralph-vibe/main/install.sh | sh
# Beta:  VERSION=v0.3.0-beta.1 curl -fsSL https://raw.githubusercontent.com/whatiskadudoing/ralph-vibe/main/install.sh | sh

set -e

REPO="whatiskadudoing/ralph-vibe"
INSTALL_DIR="${RALPH_INSTALL_DIR:-$HOME/.ralph/bin}"
BINARY_NAME="ralph"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

info() {
    printf "${CYAN}info${NC}: %s\n" "$1"
}

success() {
    printf "${GREEN}success${NC}: %s\n" "$1"
}

warn() {
    printf "${YELLOW}warn${NC}: %s\n" "$1"
}

error() {
    printf "${RED}error${NC}: %s\n" "$1"
    exit 1
}

# Detect OS and architecture
detect_platform() {
    OS="$(uname -s)"
    ARCH="$(uname -m)"

    case "$OS" in
        Linux*)
            case "$ARCH" in
                x86_64) PLATFORM="ralph-linux-x64" ;;
                *) error "Unsupported Linux architecture: $ARCH" ;;
            esac
            ;;
        Darwin*)
            case "$ARCH" in
                x86_64) PLATFORM="ralph-macos-x64" ;;
                arm64) PLATFORM="ralph-macos-arm64" ;;
                *) error "Unsupported macOS architecture: $ARCH" ;;
            esac
            ;;
        MINGW*|MSYS*|CYGWIN*)
            PLATFORM="ralph-windows-x64.exe"
            BINARY_NAME="ralph.exe"
            ;;
        *)
            error "Unsupported operating system: $OS"
            ;;
    esac
}

# Get release version (uses VERSION env var if set, otherwise latest)
get_version() {
    if [ -n "$VERSION" ]; then
        info "Using specified version: $VERSION"
        return
    fi
    VERSION=$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" | grep '"tag_name"' | sed -E 's/.*"tag_name": "([^"]+)".*/\1/')
    if [ -z "$VERSION" ]; then
        error "Failed to get latest version. Check your internet connection."
    fi
}

# Download and install
install() {
    info "Detecting platform..."
    detect_platform
    info "Platform: $PLATFORM"

    info "Fetching version..."
    get_version
    info "Version: $VERSION"

    DOWNLOAD_URL="https://github.com/$REPO/releases/download/$VERSION/$PLATFORM"

    info "Downloading from $DOWNLOAD_URL..."

    # Create install directory
    mkdir -p "$INSTALL_DIR"

    # Download binary
    if command -v curl > /dev/null 2>&1; then
        curl -fsSL "$DOWNLOAD_URL" -o "$INSTALL_DIR/$BINARY_NAME"
    elif command -v wget > /dev/null 2>&1; then
        wget -q "$DOWNLOAD_URL" -O "$INSTALL_DIR/$BINARY_NAME"
    else
        error "Neither curl nor wget found. Please install one of them."
    fi

    # Make executable
    chmod +x "$INSTALL_DIR/$BINARY_NAME"

    success "Ralph Vibe installed to $INSTALL_DIR/$BINARY_NAME"

    # Check for existing ralph binary that might conflict
    EXISTING_RALPH=$(command -v ralph 2>/dev/null || true)
    if [ -n "$EXISTING_RALPH" ] && [ "$EXISTING_RALPH" != "$INSTALL_DIR/$BINARY_NAME" ]; then
        warn "Found existing ralph at: $EXISTING_RALPH"
        warn "You may need to remove it or ensure $INSTALL_DIR is first in PATH"
    fi

    # Add to PATH if not already there
    case ":$PATH:" in
        *":$INSTALL_DIR:"*)
            success "Ralph is ready! Run 'ralph --help' to get started."
            ;;
        *)
            # Detect shell profile
            SHELL_NAME=$(basename "$SHELL")
            case "$SHELL_NAME" in
                zsh)  PROFILE="$HOME/.zshrc" ;;
                bash)
                    if [ -f "$HOME/.bash_profile" ]; then
                        PROFILE="$HOME/.bash_profile"
                    else
                        PROFILE="$HOME/.bashrc"
                    fi
                    ;;
                *)    PROFILE="$HOME/.profile" ;;
            esac

            # Add PATH export if not already present
            PATH_EXPORT="export PATH=\"$INSTALL_DIR:\$PATH\""
            if ! grep -q "$INSTALL_DIR" "$PROFILE" 2>/dev/null; then
                echo "" >> "$PROFILE"
                echo "# Ralph Vibe" >> "$PROFILE"
                echo "$PATH_EXPORT" >> "$PROFILE"
                info "Added Ralph to PATH in $PROFILE"
            fi

            success "Ralph is ready! Restart your shell or run: source $PROFILE"
            ;;
    esac

    echo ""
    printf "${GREEN}Ralph Vibe${NC} - Run it. Go for beer. Come back to code.\n"
    echo ""

    # Show installed version
    info "Installed version: $($INSTALL_DIR/$BINARY_NAME --version 2>/dev/null | head -1 || echo 'unknown')"
}

# Run installer
install
