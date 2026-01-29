import { motion } from 'framer-motion';
import { Bike, Car, Truck, Package, Box, Home, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const services = [
  {
    id: 'bike_taxi',
    icon: Bike,
    name: 'Bike Taxi',
    description: 'Quick & affordable rides for solo travelers',
    price: 'Starting ₹20',
    color: 'from-green-500 to-emerald-600',
  },
  {
    id: 'auto_rickshaw',
    icon: Car,
    name: 'Auto Rickshaw',
    description: 'Comfortable rides for short distances',
    price: 'Starting ₹30',
    color: 'from-yellow-500 to-orange-500',
  },
  {
    id: 'cab',
    icon: Car,
    name: 'Cab',
    description: 'Premium car rides with AC comfort',
    price: 'Starting ₹50',
    color: 'from-blue-500 to-indigo-600',
  },
  {
    id: 'parcel_delivery',
    icon: Package,
    name: 'Parcel Delivery',
    description: 'Same-day delivery for small packages',
    price: 'Starting ₹40',
    color: 'from-purple-500 to-pink-500',
  },
  {
    id: 'heavy_goods',
    icon: Truck,
    name: 'Heavy Goods',
    description: 'Trucks for large cargo transport',
    price: 'Starting ₹200',
    color: 'from-red-500 to-orange-600',
  },
  {
    id: 'packers_movers',
    icon: Home,
    name: 'Packers & Movers',
    description: 'Complete relocation solutions',
    price: 'Starting ₹500',
    color: 'from-teal-500 to-cyan-600',
  },
  {
    id: 'intercity_goods',
    icon: MapPin,
    name: 'Intercity Goods',
    description: 'Long-distance freight transport',
    price: 'Starting ₹300',
    color: 'from-amber-500 to-yellow-600',
  },
];

export const Services = () => {
  const navigate = useNavigate();

  return (
    <section id="services" className="py-24 bg-card">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
            Our <span className="gradient-text">Services</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            From quick bike rides to heavy goods transport - we've got you covered
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {services.map((service, index) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              onClick={() => navigate(`/dashboard?service=${service.id}`)}
              className="service-card group"
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${service.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <service.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-display text-xl font-semibold mb-2">{service.name}</h3>
              <p className="text-muted-foreground text-sm mb-4">{service.description}</p>
              <div className="text-primary font-semibold">{service.price}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
