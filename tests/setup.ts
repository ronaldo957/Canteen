import "dotenv/config";

process.env.AUTH_SECRET ||= "test-secret-not-for-production-0123456789";
process.env.QR_SIGNING_SECRET ||= "test-qr-secret-not-for-production-0123456789";
process.env.RAZORPAY_KEY_SECRET ||= "test_razorpay_secret_key";
