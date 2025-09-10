#!/bin/bash

# SMS Testing Script using curl
# This script allows you to test SMS functionality using curl commands

BASE_URL="http://localhost:5000"
PHONE_NUMBER="+260971234567"

echo "🧪 SMS Testing with curl"
echo "Base URL: $BASE_URL"
echo "Test Phone: $PHONE_NUMBER"
echo "=========================="

# Function to send SMS simulation
send_sms() {
    local phone="$1"
    local message="$2"
    local description="$3"

    echo ""
    echo "📱 $description"
    echo "📞 From: $phone"
    echo "💬 Message: '$message'"

    curl -s -X POST "$BASE_URL/api/sms/incoming" \
         -H "Content-Type: application/json" \
         -d "{
           \"webhookEvent\": \"MESSAGE_RECEIVED\",
           \"sender\": \"$phone\",
           \"message\": \"$message\",
           \"timestamp\": \"$(date -Iseconds)\"
         }" | jq '.' 2>/dev/null || echo "Response received (jq not available for pretty printing)"
}

# Test scenarios
echo ""
echo "1️⃣ Testing appointment viewing..."
send_sms "$PHONE_NUMBER" "my appointments" "View appointments"

echo ""
echo "2️⃣ Testing appointment cancellation..."
send_sms "$PHONE_NUMBER" "cancel my appointment" "Cancel appointment"

echo ""
echo "3️⃣ Testing specific appointment cancellation..."
send_sms "$PHONE_NUMBER" "cancel 1" "Cancel specific appointment"

echo ""
echo "4️⃣ Testing appointment rescheduling..."
send_sms "$PHONE_NUMBER" "reschedule my appointment" "Reschedule appointment"

echo ""
echo "5️⃣ Testing specific appointment rescheduling..."
send_sms "$PHONE_NUMBER" "reschedule 1" "Reschedule specific appointment"

echo ""
echo "6️⃣ Testing with unregistered phone..."
send_sms "+260991234567" "my appointments" "Unregistered phone test"

echo ""
echo "7️⃣ Testing booking consultation..."
send_sms "$PHONE_NUMBER" "book consultation" "Book consultation"

echo ""
echo "=========================="
echo "✅ All SMS tests completed!"
echo ""
echo "💡 Tips:"
echo "   - Check server logs for detailed processing information"
echo "   - Use different phone numbers to test patient isolation"
echo "   - Create test appointments via web interface first"
echo "   - Monitor database changes to verify functionality"
