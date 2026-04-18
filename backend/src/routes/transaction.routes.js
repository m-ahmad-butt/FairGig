const express = require('express');
const transactionController = require('../controllers/transaction.controller');

const router = express.Router();

router.post('/create-payment-intent', transactionController.createPaymentIntent);
router.get('/verify-payment/:sessionId', transactionController.verifyPayment);
router.get('/my', transactionController.getMyTransactions);
router.get('/:id', transactionController.getTransactionById);

module.exports = router;