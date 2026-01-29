import { motion } from 'framer-motion';
import { Shield, Clock, MapPin, CreditCard, Headphones, Star } from 'lucide-react';

const features = [
  {
    icon: Clock,
    title: 'Real-time Tracking',
    description: 'Track your ride or delivery live on the map with precise ETA updates.',
  },
  {
    icon: Shield,
    title: 'Verified Partners',
    description: 'All drivers undergo background checks and vehicle inspections.',
  },
  {
    icon: CreditCard,
    title: 'Flexible Payments',
    description: 'Pay via cash, cards, UPI, or digital wallets - your choice.',
  },
  {
    icon: MapPin,
    title: 'Wide Coverage',
    description: 'Available in 50+ cities with expanding coverage every month.',
  },
  {
    icon: Headphones,
    title: '24/7 Support',
    description: 'Round-the-clock customer support for all your queries.',
  },
  {
    icon: Star,
    title: 'Fair Pricing',
    description: 'Transparent pricing with no hidden charges or surge pricing.',
  },
];

export const Features = () => {
  return (
    <section id="about" className="py-24">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
            Why Choose <span className="gradient-text">LIFTON</span>?
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Built for reliability, designed for convenience
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="glass-card rounded-2xl p-8 hover-lift"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                <feature.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-display text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
