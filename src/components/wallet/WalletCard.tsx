import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Wallet, Plus, CreditCard, ArrowUpRight, ArrowDownLeft, Loader2, CheckCircle } from 'lucide-react';

interface WalletTransaction {
  id: string;
  amount: number;
  transaction_type: string;
  description: string | null;
  payment_gateway: string | null;
  status: string;
  created_at: string;
}

export const WalletCard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [balance, setBalance] = useState<number>(0);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState<'stripe' | 'razorpay'>('stripe');

  useEffect(() => {
    if (user) {
      fetchWallet();
      handlePaymentCallback();
    }
  }, [user, searchParams]);

  const handlePaymentCallback = async () => {
    const topupStatus = searchParams.get('wallet_topup');
    const amount = searchParams.get('amount');
    
    if (topupStatus === 'success' && amount) {
      toast({
        title: 'Payment Successful!',
        description: `₹${amount} has been added to your wallet`,
      });
      // Clear URL params
      setSearchParams({});
      // Refresh wallet
      fetchWallet();
    } else if (topupStatus === 'cancelled') {
      toast({
        title: 'Payment Cancelled',
        description: 'Your wallet top-up was cancelled',
        variant: 'destructive',
      });
      setSearchParams({});
    }
  };

  const fetchWallet = async () => {
    if (!user) return;

    // Get or create wallet
    let { data: wallet } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!wallet) {
      const { data: newWallet } = await supabase
        .from('wallets')
        .insert({ user_id: user.id })
        .select()
        .single();
      wallet = newWallet;
    }

    if (wallet) {
      setBalance(wallet.balance);
      setWalletId(wallet.id);

      // Fetch transactions
      const { data: txns } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('wallet_id', wallet.id)
        .order('created_at', { ascending: false })
        .limit(10);

      setTransactions(txns || []);
    }
    setLoading(false);
  };

  const handleStripeTopUp = async () => {
    const amount = parseFloat(topUpAmount);
    if (isNaN(amount) || amount < 10) {
      toast({
        title: 'Invalid Amount',
        description: 'Minimum top-up amount is ₹10',
        variant: 'destructive',
      });
      return;
    }

    setTopUpLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('create-wallet-topup', {
        body: { amount, currency: 'inr' },
      });

      if (error) throw error;

      if (data?.url) {
        // Open Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error('Failed to create payment session');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Payment failed';
      toast({
        title: 'Payment Error',
        description: message,
        variant: 'destructive',
      });
      setTopUpLoading(false);
    }
  };

  const handleDemoTopUp = async () => {
    // For demo/Razorpay - simulate successful payment
    const amount = parseFloat(topUpAmount);
    if (isNaN(amount) || amount < 10) {
      toast({
        title: 'Invalid Amount',
        description: 'Minimum top-up amount is ₹10',
        variant: 'destructive',
      });
      return;
    }

    setTopUpLoading(true);
    
    try {
      // Create transaction record
      const { data: txn, error } = await supabase
        .from('wallet_transactions')
        .insert({
          wallet_id: walletId,
          amount,
          transaction_type: 'credit',
          description: 'Wallet top-up',
          payment_gateway: selectedGateway,
          status: 'completed',
        })
        .select()
        .single();

      if (error) throw error;

      // Update wallet balance
      const { error: updateError } = await supabase
        .from('wallets')
        .update({ balance: balance + amount })
        .eq('id', walletId);

      if (updateError) throw updateError;

      setBalance((prev) => prev + amount);
      setTransactions((prev) => [txn, ...prev]);
      setTopUpAmount('');
      setDialogOpen(false);

      toast({
        title: 'Top-up Successful!',
        description: `₹${amount} added to your wallet`,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Payment failed';
      toast({
        title: 'Top-up Failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setTopUpLoading(false);
    }
  };

  const handleTopUp = async () => {
    if (selectedGateway === 'stripe') {
      await handleStripeTopUp();
    } else {
      await handleDemoTopUp();
    }
  };

  const quickAmounts = [100, 200, 500, 1000];

  if (loading) {
    return (
      <Card className="bg-card/50 backdrop-blur">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/20 overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="w-5 h-5 text-primary" />
            LIFTON Wallet
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Balance Display */}
          <div className="mb-6">
            <p className="text-sm text-muted-foreground mb-1">Available Balance</p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-primary">₹{balance.toLocaleString()}</span>
              <span className="text-sm text-muted-foreground">.00</span>
            </div>
          </div>

          {/* Top-up Dialog */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full mb-4">
                <Plus className="w-4 h-4 mr-2" />
                Add Money
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Money to Wallet</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Quick amounts */}
                <div className="grid grid-cols-4 gap-2">
                  {quickAmounts.map((amount) => (
                    <Button
                      key={amount}
                      variant={topUpAmount === String(amount) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTopUpAmount(String(amount))}
                    >
                      ₹{amount}
                    </Button>
                  ))}
                </div>

                {/* Custom amount */}
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                  <Input
                    type="number"
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="pl-8"
                    min={10}
                  />
                </div>

                {/* Payment Gateway Selection */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">Payment Method</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedGateway('stripe')}
                      className={`p-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                        selectedGateway === 'stripe'
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      <span className="text-sm font-medium">Stripe</span>
                      <CheckCircle className={`w-4 h-4 ${selectedGateway === 'stripe' ? 'text-primary' : 'opacity-0'}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedGateway('razorpay')}
                      className={`p-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                        selectedGateway === 'razorpay'
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <span className="text-lg">💳</span>
                      <span className="text-sm font-medium">Razorpay</span>
                      <CheckCircle className={`w-4 h-4 ${selectedGateway === 'razorpay' ? 'text-primary' : 'opacity-0'}`} />
                    </button>
                  </div>
                  {selectedGateway === 'razorpay' && (
                    <p className="text-xs text-muted-foreground">
                      Demo mode: Payment will be simulated
                    </p>
                  )}
                </div>

                <Button
                  className="w-full"
                  onClick={handleTopUp}
                  disabled={topUpLoading || !topUpAmount}
                >
                  {topUpLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  {selectedGateway === 'stripe' ? 'Pay with Stripe' : 'Add'} ₹{topUpAmount || '0'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Recent Transactions */}
          {transactions.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Recent</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {transactions.slice(0, 5).map((txn) => (
                  <div
                    key={txn.id}
                    className="flex items-center justify-between py-2 text-sm border-b border-border/50 last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      {txn.transaction_type === 'credit' ? (
                        <ArrowDownLeft className="w-4 h-4 text-green-500" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4 text-red-500" />
                      )}
                      <span className="text-muted-foreground">{txn.description || 'Transaction'}</span>
                    </div>
                    <span className={txn.transaction_type === 'credit' ? 'text-green-500' : 'text-red-500'}>
                      {txn.transaction_type === 'credit' ? '+' : '-'}₹{txn.amount}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
