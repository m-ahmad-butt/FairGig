const transactionRepo = require('../repositories/transaction.repository');
const userRepo = require('../repositories/user.repository');
const notificationRepo = require('../repositories/notification.repository');
const emailService = require('../services/email.service');
const notificationService = require('../services/notification.service');
const { publishMessage } = require('../config/rabbitmq');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const createPaymentIntent = async (req, res) => {
  try {
    const { amount, description } = req.body;
    const userId = req.headers['x-user-email'];

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Valid amount is required' });
    }

    // Create Stripe Checkout Session instead of Payment Intent
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: description || 'Payment',
              description: 'FAST-EX Platform Payment',
            },
            unit_amount: amount * 100, // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/payments/failed`,
      metadata: {
        userId,
        description: description || 'Payment',
      },
    });

    // Create transaction record
    const transaction = await transactionRepo.createTransaction({
      userId,
      description: description || 'Payment',
      amount,
      currency: 'USD',
      status: 'PENDING',
      stripePaymentId: session.id,
      stripeClientSecret: session.id
    });

    // Create notification for pending payment
    try {
      await notificationService.createPaymentNotification(
        userId,
        'Payment Pending',
        `Your payment of ${amount.toFixed(2)} is being processed. Transaction ID: ${transaction.id}`,
        'payment_success'
      );
    } catch (notifError) {
      console.error('Failed to create notification:', notifError);
    }

    res.status(201).json({
      transactionId: transaction.id,
      sessionId: session.id,
      checkoutUrl: session.url,
      amount,
      currency: 'USD'
    });
  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({ message: 'Failed to create payment intent' });
  }
};

const getMyTransactions = async (req, res) => {
  try {
    const userId = req.headers['x-user-email'];
    const { page = 1, limit = 20 } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const transactions = await transactionRepo.findTransactionsByUser(userId);
    
    const paginatedTransactions = transactions.slice(skip, skip + parseInt(limit));
    
    res.status(200).json({
      transactions: paginatedTransactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: transactions.length,
        totalPages: Math.ceil(transactions.length / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-email'];
    
    const transaction = await transactionRepo.findTransactionById(id);
    
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    
    if (transaction.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.status(200).json(transaction);
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.headers['x-user-email'];

    console.log('[VERIFY] Verifying payment for session:', sessionId);
    console.log('[VERIFY] User:', userId);

    // Find transaction by session ID
    const transactions = await transactionRepo.findTransactionsByUser(userId);
    console.log('[VERIFY] Found', transactions.length, 'transactions');
    
    const transaction = transactions.find(t => t.stripePaymentId === sessionId);
    console.log('[VERIFY] Transaction found:', !!transaction);

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Verify with Stripe that the session was completed
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      console.log('[VERIFY] Stripe session status:', session.payment_status);
      
      // If payment was successful and transaction is still PENDING, update it
      if (session.payment_status === 'paid' && transaction.status === 'PENDING') {
        console.log('[VERIFY] Updating transaction to COMPLETED');
        await transactionRepo.updateTransaction(transaction.id, {
          status: 'COMPLETED'
        });
        transaction.status = 'COMPLETED';
        
        // Send email receipt
        try {
          const user = await userRepo.findByEmail(userId);
          await emailService.sendPaymentReceipt(
            userId,
            user?.name || 'User',
            {
              amount: transaction.amount,
              description: transaction.description,
              transactionId: transaction.id,
              status: 'COMPLETED',
              createdAt: transaction.createdAt
            }
          );
          console.log('[VERIFY] Email sent');
        } catch (emailError) {
          console.error('[VERIFY] Failed to send email:', emailError.message);
        }

        // Create notification
        try {
          await notificationRepo.createNotification({
            to: userId,
            from: 'system',
            title: 'Payment Successful',
            content: `Your payment of ${transaction.amount.toFixed(2)} has been successfully processed. Transaction ID: ${transaction.id}`,
            type: 'payment_success',
            metadata: {
              transactionId: transaction.id,
              amount: transaction.amount
            }
          });
          console.log('[VERIFY] Notification created');
          
          // Clear notification cache
          const redis = require('../config/redis');
          try {
            await redis.del(`notifications:${userId}`);
            console.log('[VERIFY] Notification cache cleared');
          } catch (cacheError) {
            console.error('[VERIFY] Failed to clear cache:', cacheError.message);
          }
        } catch (notifError) {
          console.error('[VERIFY] Failed to create notification:', notifError.message);
        }
      }
    } catch (stripeError) {
      console.error('[VERIFY] Failed to verify with Stripe:', stripeError.message);
    }

    res.status(200).json(transaction);
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const handleWebhook = async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    console.log('[WEBHOOK] Received webhook');
    console.log('[WEBHOOK] Signature present:', !!sig);
    console.log('[WEBHOOK] Endpoint secret present:', !!endpointSecret);

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
      console.log('[WEBHOOK] Event verified. Type:', event.type);
    } catch (err) {
      console.error('[WEBHOOK] Signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle checkout session completed
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      console.log('[WEBHOOK] Processing checkout.session.completed');
      console.log('[WEBHOOK] Session ID:', session.id);
      console.log('[WEBHOOK] Metadata:', session.metadata);
      
      try {
        const transactions = await transactionRepo.findTransactionsByUser(session.metadata.userId);
        console.log('[WEBHOOK] Found', transactions.length, 'transactions for user');
        
        const transaction = transactions.find(t => t.stripePaymentId === session.id);
        console.log('[WEBHOOK] Matching transaction found:', !!transaction);

        if (transaction) {
          console.log('[WEBHOOK] Updating transaction', transaction.id, 'to COMPLETED');
          await transactionRepo.updateTransaction(transaction.id, {
            status: 'COMPLETED'
          });
          console.log('[WEBHOOK] Transaction updated successfully');

          // Get user details
          const user = await userRepo.findByEmail(transaction.userId);

          // Send email receipt
          try {
            await emailService.sendPaymentReceipt(
              transaction.userId,
              user?.name || 'User',
              {
                amount: transaction.amount,
                description: transaction.description,
                transactionId: transaction.id,
                status: 'COMPLETED',
                createdAt: transaction.createdAt
              }
            );
            console.log('[WEBHOOK] Email sent');
          } catch (emailError) {
            console.error('[WEBHOOK] Failed to send email:', emailError.message);
          }

          // Create in-app notification
          try {
            await notificationRepo.createNotification({
              to: transaction.userId,
              from: 'system',
              title: 'Payment Successful',
              content: `Your payment of ${transaction.amount.toFixed(2)} has been successfully processed. Transaction ID: ${transaction.id}`,
              type: 'payment_success',
              metadata: {
                transactionId: transaction.id,
                amount: transaction.amount
              }
            });
            console.log('[WEBHOOK] Notification created');
          } catch (notifError) {
            console.error('[WEBHOOK] Failed to create notification:', notifError.message);
          }

          // Publish message to RabbitMQ
          try {
            await publishMessage('transaction.completed', {
              transactionId: transaction.id,
              userId: transaction.userId,
              amount: transaction.amount
            }, 'hackathon.topic');
            console.log('[WEBHOOK] Message published to RabbitMQ');
          } catch (rabbitError) {
            console.error('[WEBHOOK] Failed to publish to RabbitMQ:', rabbitError.message);
          }
        } else {
          console.log('[WEBHOOK] No matching transaction found');
        }
      } catch (error) {
        console.error('[WEBHOOK] Error processing checkout.session.completed:', error);
      }
    }

    // Handle payment intent succeeded (backup)
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      console.log('[WEBHOOK] Processing payment_intent.succeeded');
      
      try {
        const transactions = await transactionRepo.findTransactionsByUser(paymentIntent.metadata.userId);
        const transaction = transactions.find(t => t.stripePaymentId === paymentIntent.id);

        if (transaction) {
          console.log('[WEBHOOK] Updating transaction', transaction.id, 'to COMPLETED');
          await transactionRepo.updateTransaction(transaction.id, {
            status: 'COMPLETED'
          });

          const user = await userRepo.findByEmail(transaction.userId);

          try {
            await emailService.sendPaymentReceipt(
              transaction.userId,
              user?.name || 'User',
              {
                amount: transaction.amount,
                description: transaction.description,
                transactionId: transaction.id,
                status: 'COMPLETED',
                createdAt: transaction.createdAt
              }
            );
          } catch (emailError) {
            console.error('[WEBHOOK] Failed to send email:', emailError.message);
          }

          try {
            await notificationRepo.createNotification({
              to: transaction.userId,
              from: 'system',
              title: 'Payment Successful',
              content: `Your payment of ${transaction.amount.toFixed(2)} has been successfully processed. Transaction ID: ${transaction.id}`,
              type: 'payment_success',
              metadata: {
                transactionId: transaction.id,
                amount: transaction.amount
              }
            });
          } catch (notifError) {
            console.error('[WEBHOOK] Failed to create notification:', notifError.message);
          }

          try {
            await publishMessage('transaction.completed', {
              transactionId: transaction.id,
              userId: transaction.userId,
              amount: transaction.amount
            }, 'hackathon.topic');
          } catch (rabbitError) {
            console.error('[WEBHOOK] Failed to publish to RabbitMQ:', rabbitError.message);
          }
        }
      } catch (error) {
        console.error('[WEBHOOK] Error processing payment_intent.succeeded:', error);
      }
    } else if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object;
      console.log('[WEBHOOK] Processing payment_intent.payment_failed');
      
      try {
        const transactions = await transactionRepo.findTransactionsByUser(paymentIntent.metadata.userId);
        const transaction = transactions.find(t => t.stripePaymentId === paymentIntent.id);

        if (transaction) {
          console.log('[WEBHOOK] Updating transaction', transaction.id, 'to FAILED');
          await transactionRepo.updateTransaction(transaction.id, {
            status: 'FAILED'
          });

          const user = await userRepo.findByEmail(transaction.userId);

          try {
            await emailService.sendPaymentReceipt(
              transaction.userId,
              user?.name || 'User',
              {
                amount: transaction.amount,
                description: transaction.description,
                transactionId: transaction.id,
                status: 'FAILED',
                createdAt: transaction.createdAt
              }
            );
          } catch (emailError) {
            console.error('[WEBHOOK] Failed to send email:', emailError.message);
          }

          try {
            await notificationRepo.createNotification({
              to: transaction.userId,
              from: 'system',
              title: 'Payment Failed',
              content: `Your payment of ${transaction.amount.toFixed(2)} could not be processed. Please try again. Transaction ID: ${transaction.id}`,
              type: 'payment_failed',
              metadata: {
                transactionId: transaction.id,
                amount: transaction.amount
              }
            });
          } catch (notifError) {
            console.error('[WEBHOOK] Failed to create notification:', notifError.message);
          }

          try {
            await publishMessage('transaction.failed', {
              transactionId: transaction.id,
              userId: transaction.userId,
              amount: transaction.amount
            }, 'hackathon.topic');
          } catch (rabbitError) {
            console.error('[WEBHOOK] Failed to publish to RabbitMQ:', rabbitError.message);
          }
        }
      } catch (error) {
        console.error('[WEBHOOK] Error processing payment_intent.payment_failed:', error);
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('[WEBHOOK] Webhook error:', error);
    res.status(500).json({ message: 'Webhook processing failed' });
  }
};

module.exports = { createPaymentIntent, getMyTransactions, getTransactionById, verifyPayment, handleWebhook };
