#!/bin/bash
# Creates test node accounts and the blockchain room

set -e

HOMESERVER_URL="${MATRIX_HOMESERVER_URL:-http://localhost:8008}"
SHARED_SECRET="HFjv+L5r@41xwt0yWoZGE_^,;4d#frmlz.3F*Ru;9o,~HVgl8c"
ROOM_ALIAS="blockchain"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_dependencies() {
    if ! command -v curl &> /dev/null; then
        log_error "curl is required but not installed"
        exit 1
    fi
    if ! command -v jq &> /dev/null; then
        log_error "jq is required but not installed. Install with: brew install jq"
        exit 1
    fi
}

wait_for_synapse() {
    log_info "Waiting for Synapse to be ready at $HOMESERVER_URL..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -sf "$HOMESERVER_URL/health" > /dev/null 2>&1; then
            log_info "Synapse is healthy!"
            return 0
        fi
        echo -n "."
        sleep 2
        ((attempt++))
    done
    
    echo ""
    log_error "Synapse did not become healthy after $max_attempts attempts"
    exit 1
}

# Generate HMAC-SHA1 for Synapse admin registration
# Synapse uses HMAC-SHA1 for the nonce-based registration
generate_mac() {
    local nonce="$1"
    local username="$2"
    local password="$3"
    local admin="$4"
    
    local message="${nonce}\x00${username}\x00${password}\x00${admin}"
    echo -n -e "$message" | openssl dgst -sha1 -hmac "$SHARED_SECRET" | awk '{print $2}'
}

register_user() {
    local username="$1"
    local password="$2"
    
    log_info "Registering user @${username}:localhost..."
    
    # Get a nonce
    local nonce_response=$(curl -sf "$HOMESERVER_URL/_synapse/admin/v1/register" 2>/dev/null)
    if [ -z "$nonce_response" ]; then
        log_error "Failed to get registration nonce"
        return 1
    fi
    
    local nonce=$(echo "$nonce_response" | jq -r '.nonce')
    
    # Generate MAC
    local mac=$(generate_mac "$nonce" "$username" "$password" "notadmin")
    
    # Register the user
    local register_response=$(curl -sf -X POST "$HOMESERVER_URL/_synapse/admin/v1/register" \
        -H "Content-Type: application/json" \
        -d "{
            \"nonce\": \"$nonce\",
            \"username\": \"$username\",
            \"password\": \"$password\",
            \"admin\": false,
            \"mac\": \"$mac\"
        }" 2>/dev/null)
    
    if echo "$register_response" | jq -e '.user_id' > /dev/null 2>&1; then
        log_info "Successfully registered @${username}:localhost"
        return 0
    elif echo "$register_response" | jq -e '.errcode' | grep -q "M_USER_IN_USE" 2>/dev/null; then
        log_warn "User @${username}:localhost already exists"
        return 0
    else
        log_error "Failed to register @${username}:localhost: $register_response"
        return 1
    fi
}

# Login and get access token
login_user() {
    local username="$1"
    local password="$2"
    
    local login_response=$(curl -sf -X POST "$HOMESERVER_URL/_matrix/client/v3/login" \
        -H "Content-Type: application/json" \
        -d "{
            \"type\": \"m.login.password\",
            \"identifier\": {
                \"type\": \"m.id.user\",
                \"user\": \"$username\"
            },
            \"password\": \"$password\"
        }" 2>/dev/null)
    
    if [ -z "$login_response" ]; then
        log_error "Failed to login as $username"
        return 1
    fi
    
    echo "$login_response" | jq -r '.access_token'
}

# Create the blockchain room
create_blockchain_room() {
    local access_token="$1"
    
    log_info "Creating #${ROOM_ALIAS}:localhost room..."
    
    # Check if room already exists
    local room_check=$(curl -sf "$HOMESERVER_URL/_matrix/client/v3/directory/room/%23${ROOM_ALIAS}:localhost" 2>/dev/null)
    if echo "$room_check" | jq -e '.room_id' > /dev/null 2>&1; then
        local existing_room_id=$(echo "$room_check" | jq -r '.room_id')
        log_warn "Room #${ROOM_ALIAS}:localhost already exists: $existing_room_id"
        return 0
    fi
    
    # Create the room
    local create_response=$(curl -sf -X POST "$HOMESERVER_URL/_matrix/client/v3/createRoom" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $access_token" \
        -d "{
            \"room_alias_name\": \"$ROOM_ALIAS\",
            \"name\": \"Naive Blockchain Network\",
            \"topic\": \"P2P blockchain network room for block and transaction propagation\",
            \"preset\": \"public_chat\",
            \"visibility\": \"public\",
            \"initial_state\": [
                {
                    \"type\": \"m.room.history_visibility\",
                    \"content\": {
                        \"history_visibility\": \"shared\"
                    }
                },
                {
                    \"type\": \"m.room.guest_access\",
                    \"content\": {
                        \"guest_access\": \"forbidden\"
                    }
                }
            ]
        }" 2>/dev/null)
    
    if echo "$create_response" | jq -e '.room_id' > /dev/null 2>&1; then
        local room_id=$(echo "$create_response" | jq -r '.room_id')
        log_info "Successfully created room #${ROOM_ALIAS}:localhost ($room_id)"
        return 0
    else
        log_error "Failed to create room: $create_response"
        return 1
    fi
}

main() {
    echo ""
    echo "========================================"
    echo "  Naive Blockchain Matrix Setup Script"
    echo "========================================"
    echo ""
    
    check_dependencies
    wait_for_synapse
    
    echo ""
    log_info "Creating node accounts..."
    echo ""
    
    # Create 3 node accounts
    register_user "node1" "node1pass"
    register_user "node2" "node2pass"
    register_user "node3" "node3pass"
    
    echo ""
    log_info "Setting up blockchain room..."
    echo ""
    
    # Login as node1 to create the room
    local access_token=$(login_user "node1" "node1pass")
    if [ -z "$access_token" ] || [ "$access_token" = "null" ]; then
        log_error "Failed to get access token for node1"
        exit 1
    fi
    
    create_blockchain_room "$access_token"
    
    echo ""
    echo "========================================"
    echo "  Setup Complete!"
    echo "========================================"
    echo ""
    echo "Node accounts created:"
    echo "  - @node1:localhost (password: node1pass)"
    echo "  - @node2:localhost (password: node2pass)"
    echo "  - @node3:localhost (password: node3pass)"
    echo ""
    echo "Blockchain room: #blockchain:localhost"
    echo ""
    echo "Matrix homeserver: $HOMESERVER_URL"
    echo ""
    echo "To start a blockchain node, use:"
    echo "  MATRIX_USER_ID=\"@node1:localhost\" \\"
    echo "  MATRIX_PASSWORD=\"node1pass\" \\"
    echo "  LEDGER_SHOULD_MINE=true \\"
    echo "  pnpm --filter ledger dev"
    echo ""
}

main "$@"
