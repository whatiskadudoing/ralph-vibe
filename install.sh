#!/bin/sh
# Ralph Vibe Installer
# Usage: curl -fsSL https://raw.githubusercontent.com/whatiskadudoing/ralph-vibe/main/install.sh | sh
# Beta:  curl -fsSL https://raw.githubusercontent.com/whatiskadudoing/ralph-vibe/main/install.sh | VERSION=v0.3.0-beta.1 sh

set -e

REPO="whatiskadudoing/ralph-vibe"
INSTALL_DIR="${RALPH_INSTALL_DIR:-$HOME/.ralph/bin}"
BINARY_NAME="ralph"

# Colors (disabled if not a terminal)
if [ -t 1 ]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    CYAN='\033[0;36m'
    BOLD='\033[1m'
    NC='\033[0m'
else
    RED=''
    GREEN=''
    YELLOW=''
    CYAN=''
    BOLD=''
    NC=''
fi

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
                aarch64|arm64) PLATFORM="ralph-linux-arm64" ;;
                *) error "Unsupported Linux architecture: $ARCH. Please open an issue at https://github.com/$REPO/issues" ;;
            esac
            ;;
        Darwin*)
            # Check for Rosetta 2 (running x86_64 binary on ARM Mac)
            if [ "$ARCH" = "x86_64" ]; then
                if [ "$(sysctl -n sysctl.proc_translated 2>/dev/null || echo 0)" = "1" ]; then
                    info "Detected Rosetta 2, using native ARM64 binary"
                    ARCH="arm64"
                fi
            fi
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
            error "Unsupported operating system: $OS. Please open an issue at https://github.com/$REPO/issues"
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

# Refresh shell PATH inline (for immediate use in current session)
refresh_path() {
    export PATH="$INSTALL_DIR:$PATH"
}

# Configure shell PATH
configure_shell() {
    SHELL_NAME=$(basename "$SHELL")
    CONFIGURED=false

    info "Detected shell: $SHELL_NAME"

    case "$SHELL_NAME" in
        fish)
            configure_fish
            ;;
        zsh)
            configure_zsh
            ;;
        bash)
            configure_bash
            ;;
        *)
            configure_posix
            ;;
    esac

    # Show manual instructions if auto-config failed
    if [ "$CONFIGURED" = "false" ]; then
        echo ""
        warn "Could not automatically configure PATH. Please add manually:"
        echo ""
        printf "${BOLD}For bash/zsh:${NC}\n"
        printf "  export PATH=\"%s:\$PATH\"\n" "$INSTALL_DIR"
        echo ""
        printf "${BOLD}For fish:${NC}\n"
        printf "  fish_add_path %s\n" "$INSTALL_DIR"
        echo ""
    fi
}

configure_fish() {
    FISH_CONFIG="${XDG_CONFIG_HOME:-$HOME/.config}/fish/config.fish"

    # Ensure fish config directory exists
    mkdir -p "$(dirname "$FISH_CONFIG")"

    # Check if already configured
    if grep -q "$INSTALL_DIR" "$FISH_CONFIG" 2>/dev/null; then
        info "PATH already configured in $FISH_CONFIG"
        CONFIGURED=true
        PROFILE="$FISH_CONFIG"
        return
    fi

    # Try to write to fish config
    if [ -w "$(dirname "$FISH_CONFIG")" ] || [ -w "$FISH_CONFIG" ] 2>/dev/null; then
        {
            echo ""
            echo "# Ralph Vibe"
            echo "fish_add_path $INSTALL_DIR"
        } >> "$FISH_CONFIG"
        info "Added Ralph to PATH in $FISH_CONFIG"
        CONFIGURED=true
        PROFILE="$FISH_CONFIG"
    fi
}

configure_zsh() {
    ZSH_CONFIG="$HOME/.zshrc"

    # Check if already configured
    if grep -q "$INSTALL_DIR" "$ZSH_CONFIG" 2>/dev/null; then
        info "PATH already configured in $ZSH_CONFIG"
        CONFIGURED=true
        PROFILE="$ZSH_CONFIG"
        return
    fi

    PROFILE="$ZSH_CONFIG"

    # Try to write
    if [ -w "$HOME" ]; then
        {
            echo ""
            echo "# Ralph Vibe"
            echo "export PATH=\"$INSTALL_DIR:\$PATH\""
        } >> "$ZSH_CONFIG"
        info "Added Ralph to PATH in $ZSH_CONFIG"
        CONFIGURED=true
    fi
}

configure_bash() {
    # Try multiple bash config files in order of preference
    # Similar to how Bun handles it
    for config in "$HOME/.bashrc" "$HOME/.bash_profile" "$HOME/.profile"; do
        if [ -f "$config" ]; then
            # Check if already configured
            if grep -q "$INSTALL_DIR" "$config" 2>/dev/null; then
                info "PATH already configured in $config"
                CONFIGURED=true
                PROFILE="$config"
                return
            fi
        fi
    done

    # Find first writable config
    for config in "$HOME/.bashrc" "$HOME/.bash_profile" "$HOME/.profile"; do
        if [ -f "$config" ] && [ -w "$config" ]; then
            {
                echo ""
                echo "# Ralph Vibe"
                echo "export PATH=\"$INSTALL_DIR:\$PATH\""
            } >> "$config"
            info "Added Ralph to PATH in $config"
            CONFIGURED=true
            PROFILE="$config"
            return
        fi
    done

    # Create .bashrc if nothing exists
    if [ -w "$HOME" ]; then
        PROFILE="$HOME/.bashrc"
        {
            echo ""
            echo "# Ralph Vibe"
            echo "export PATH=\"$INSTALL_DIR:\$PATH\""
        } >> "$PROFILE"
        info "Added Ralph to PATH in $PROFILE"
        CONFIGURED=true
    fi
}

configure_posix() {
    POSIX_CONFIG="$HOME/.profile"

    # Check if already configured
    if grep -q "$INSTALL_DIR" "$POSIX_CONFIG" 2>/dev/null; then
        info "PATH already configured in $POSIX_CONFIG"
        CONFIGURED=true
        PROFILE="$POSIX_CONFIG"
        return
    fi

    PROFILE="$POSIX_CONFIG"

    # Try to write
    if [ -w "$HOME" ]; then
        {
            echo ""
            echo "# Ralph Vibe"
            echo "export PATH=\"$INSTALL_DIR:\$PATH\""
        } >> "$POSIX_CONFIG"
        info "Added Ralph to PATH in $POSIX_CONFIG"
        CONFIGURED=true
    fi
}

# Download and install
install() {
    echo ""
    printf "${GREEN}Ralph Vibe Installer${NC}\n"
    echo ""

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
        HTTP_CODE=$(curl -fsSL -w "%{http_code}" "$DOWNLOAD_URL" -o "$INSTALL_DIR/$BINARY_NAME")
        if [ "$HTTP_CODE" = "404" ]; then
            error "Version $VERSION not found. Check available releases at https://github.com/$REPO/releases"
        fi
    elif command -v wget > /dev/null 2>&1; then
        wget -q "$DOWNLOAD_URL" -O "$INSTALL_DIR/$BINARY_NAME" || error "Download failed. Check your internet connection."
    else
        error "Neither curl nor wget found. Please install one of them."
    fi

    # Make executable
    chmod +x "$INSTALL_DIR/$BINARY_NAME"

    success "Ralph Vibe installed to $INSTALL_DIR/$BINARY_NAME"

    # Check for existing ralph binary that might conflict
    EXISTING_RALPH=$(command -v ralph 2>/dev/null || true)
    if [ -n "$EXISTING_RALPH" ] && [ "$EXISTING_RALPH" != "$INSTALL_DIR/$BINARY_NAME" ]; then
        echo ""
        warn "Found existing ralph at: $EXISTING_RALPH"
        warn "This may take precedence. Either remove it or ensure $INSTALL_DIR is first in PATH"
    fi

    # Add to PATH if not already there
    case ":$PATH:" in
        *":$INSTALL_DIR:"*)
            info "Directory already in PATH"
            ;;
        *)
            configure_shell
            ;;
    esac

    # Refresh PATH for version check
    refresh_path

    echo ""
    printf "${GREEN}Ralph Vibe${NC} - Run it. Go for beer. Come back to code.\n"
    echo ""

    # Show installed version
    INSTALLED_VERSION=$("$INSTALL_DIR/$BINARY_NAME" --version 2>/dev/null | head -1 || echo "unknown")
    info "Installed version: $INSTALLED_VERSION"

    echo ""

    # Final instructions based on shell
    SHELL_NAME=$(basename "$SHELL")
    if [ "$CONFIGURED" = "true" ] && [ -n "$PROFILE" ]; then
        printf "${BOLD}To start using Ralph:${NC}\n"
        echo ""
        case "$SHELL_NAME" in
            fish)
                printf "  ${CYAN}source %s${NC}\n" "$PROFILE"
                ;;
            *)
                printf "  ${CYAN}source %s${NC}\n" "$PROFILE"
                ;;
        esac
        printf "  ${CYAN}ralph --help${NC}\n"
        echo ""
        info "Or simply open a new terminal window"
    else
        printf "${BOLD}To start using Ralph:${NC}\n"
        echo ""
        printf "  ${CYAN}%s --help${NC}\n" "$INSTALL_DIR/$BINARY_NAME"
        echo ""
    fi
}

# Run installer
install
