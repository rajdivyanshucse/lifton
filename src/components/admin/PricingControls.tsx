import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { TrendingUp, DollarSign, Percent, Save, RefreshCw } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type ServiceType = Database['public']['Enums']['service_type'];

interface ServicePricing {
  id: string;
  service_type: ServiceType;
  base_fare: number;
  per_km_rate: number;
  minimum_fare: number;
  surge_multiplier: number;
  is_active: boolean;
}

interface CompetitorPrice {
  id: string;
  competitor_name: string;
  service_type: ServiceType;
  base_fare: number;
  per_km_rate: number;
  surge_multiplier: number;
}

const serviceTypeLabels: Record<ServiceType, string> = {
  bike_taxi: 'Bike Taxi',
  auto_rickshaw: 'Auto Rickshaw',
  cab: 'Cab',
  parcel_delivery: 'Parcel Delivery',
  heavy_goods: 'Heavy Goods',
  packers_movers: 'Packers & Movers',
  intercity_goods: 'Intercity Goods',
};

export const PricingControls = () => {
  const { toast } = useToast();
  const [servicePricing, setServicePricing] = useState<ServicePricing[]>([]);
  const [competitorPrices, setCompetitorPrices] = useState<CompetitorPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPricing();
  }, []);

  const fetchPricing = async () => {
    setLoading(true);
    const [serviceRes, competitorRes] = await Promise.all([
      supabase.from('service_pricing').select('*').order('service_type'),
      supabase.from('competitor_prices').select('*').order('competitor_name, service_type'),
    ]);

    if (serviceRes.data) {
      // Map data and add surge_multiplier with default if not present
      const mappedPricing = serviceRes.data.map(p => ({
        ...p,
        surge_multiplier: (p as any).surge_multiplier ?? 1.0,
      })) as ServicePricing[];
      setServicePricing(mappedPricing);
    }
    if (competitorRes.data) setCompetitorPrices(competitorRes.data as CompetitorPrice[]);
    setLoading(false);
  };

  const updateServicePricing = async (id: string, updates: Partial<ServicePricing>) => {
    setSaving(true);
    const { error } = await supabase
      .from('service_pricing')
      .update(updates as any)
      .eq('id', id);

    if (error) {
      toast({ title: 'Error updating pricing', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Pricing updated successfully' });
      setServicePricing(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    }
    setSaving(false);
  };

  const updateCompetitorPrice = async (id: string, updates: Partial<CompetitorPrice>) => {
    setSaving(true);
    const { error } = await supabase
      .from('competitor_prices')
      .update(updates as any)
      .eq('id', id);

    if (error) {
      toast({ title: 'Error updating competitor price', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Competitor price updated successfully' });
      setCompetitorPrices(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    }
    setSaving(false);
  };

  const addCompetitorPrice = async (competitorName: string, serviceType: ServiceType) => {
    setSaving(true);
    const { data, error } = await supabase
      .from('competitor_prices')
      .insert({
        competitor_name: competitorName,
        service_type: serviceType,
        base_fare: 20,
        per_km_rate: 8,
        surge_multiplier: 1.0,
      })
      .select()
      .single();

    if (error) {
      toast({ title: 'Error adding competitor', description: error.message, variant: 'destructive' });
    } else if (data) {
      toast({ title: 'Competitor added successfully' });
      setCompetitorPrices(prev => [...prev, data as CompetitorPrice]);
    }
    setSaving(false);
  };

  const handlePricingChange = (id: string, field: keyof ServicePricing, value: string) => {
    const numValue = parseFloat(value) || 0;
    setServicePricing(prev => prev.map(p => 
      p.id === id ? { ...p, [field]: numValue } : p
    ));
  };

  const handleCompetitorChange = (id: string, field: keyof CompetitorPrice, value: string) => {
    const numValue = parseFloat(value) || 0;
    setCompetitorPrices(prev => prev.map(p => 
      p.id === id ? { ...p, [field]: numValue } : p
    ));
  };

  if (loading) {
    return (
      <Card className="dashboard-card">
        <CardContent className="p-6 text-center">
          <RefreshCw className="w-6 h-6 mx-auto animate-spin text-primary" />
          <p className="mt-2 text-muted-foreground">Loading pricing data...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="surge">
      <TabsList className="mb-6">
        <TabsTrigger value="surge">Surge Multipliers</TabsTrigger>
        <TabsTrigger value="base">Base Pricing</TabsTrigger>
        <TabsTrigger value="competitors">Competitor Prices</TabsTrigger>
      </TabsList>

      <TabsContent value="surge">
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Surge Multipliers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Adjust surge multipliers during peak hours. A multiplier of 1.5 increases fares by 50%.
            </p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {servicePricing.map((pricing) => (
                <div key={pricing.id} className="p-4 rounded-xl bg-card/50 border border-border/50">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="font-medium">{serviceTypeLabels[pricing.service_type]}</Label>
                    <Badge variant={pricing.surge_multiplier > 1 ? 'destructive' : 'secondary'}>
                      {pricing.surge_multiplier}x
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step="0.1"
                      min="1"
                      max="3"
                      value={pricing.surge_multiplier}
                      onChange={(e) => handlePricingChange(pricing.id, 'surge_multiplier', e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      size="sm" 
                      onClick={() => updateServicePricing(pricing.id, { surge_multiplier: pricing.surge_multiplier })}
                      disabled={saving}
                    >
                      <Save className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="base">
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              Base Pricing Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {servicePricing.map((pricing) => (
                <div key={pricing.id} className="p-4 rounded-xl bg-card/50 border border-border/50">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium">{serviceTypeLabels[pricing.service_type]}</h4>
                    <Badge variant={pricing.is_active ? 'default' : 'secondary'}>
                      {pricing.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Base Fare (₹)</Label>
                      <Input
                        type="number"
                        value={pricing.base_fare}
                        onChange={(e) => handlePricingChange(pricing.id, 'base_fare', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Per KM Rate (₹)</Label>
                      <Input
                        type="number"
                        value={pricing.per_km_rate}
                        onChange={(e) => handlePricingChange(pricing.id, 'per_km_rate', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Minimum Fare (₹)</Label>
                      <Input
                        type="number"
                        value={pricing.minimum_fare}
                        onChange={(e) => handlePricingChange(pricing.id, 'minimum_fare', e.target.value)}
                      />
                    </div>
                  </div>
                  <Button 
                    className="mt-4 w-full"
                    onClick={() => updateServicePricing(pricing.id, {
                      base_fare: pricing.base_fare,
                      per_km_rate: pricing.per_km_rate,
                      minimum_fare: pricing.minimum_fare,
                    })}
                    disabled={saving}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save {serviceTypeLabels[pricing.service_type]} Pricing
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="competitors">
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="w-5 h-5 text-primary" />
              Competitor Price Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Configure competitor pricing for price comparison features shown to users.
            </p>
            
            {competitorPrices.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No competitor prices configured yet.</p>
                <div className="flex gap-2 justify-center flex-wrap">
                  {['Rapido', 'Porter', 'Uber'].map((competitor) => (
                    <Button 
                      key={competitor}
                      variant="outline" 
                      onClick={() => addCompetitorPrice(competitor, 'bike_taxi')}
                      disabled={saving}
                    >
                      Add {competitor}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(
                  competitorPrices.reduce((acc, price) => {
                    if (!acc[price.competitor_name]) acc[price.competitor_name] = [];
                    acc[price.competitor_name].push(price);
                    return acc;
                  }, {} as Record<string, CompetitorPrice[]>)
                ).map(([competitor, prices]) => (
                  <div key={competitor} className="p-4 rounded-xl bg-card/50 border border-border/50">
                    <h4 className="font-medium mb-4 text-lg">{competitor}</h4>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {prices.map((price) => (
                        <div key={price.id} className="p-3 rounded-lg bg-background/50 border border-border/30">
                          <Label className="text-xs font-medium">{serviceTypeLabels[price.service_type]}</Label>
                          <div className="grid grid-cols-3 gap-2 mt-2">
                            <div>
                              <Label className="text-xs text-muted-foreground">Base (₹)</Label>
                              <Input
                                type="number"
                                value={price.base_fare}
                                onChange={(e) => handleCompetitorChange(price.id, 'base_fare', e.target.value)}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">/KM (₹)</Label>
                              <Input
                                type="number"
                                value={price.per_km_rate}
                                onChange={(e) => handleCompetitorChange(price.id, 'per_km_rate', e.target.value)}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Surge</Label>
                              <Input
                                type="number"
                                step="0.1"
                                value={price.surge_multiplier}
                                onChange={(e) => handleCompetitorChange(price.id, 'surge_multiplier', e.target.value)}
                                className="h-8 text-sm"
                              />
                            </div>
                          </div>
                          <Button 
                            size="sm"
                            className="mt-2 w-full h-7"
                            onClick={() => updateCompetitorPrice(price.id, {
                              base_fare: price.base_fare,
                              per_km_rate: price.per_km_rate,
                              surge_multiplier: price.surge_multiplier,
                            })}
                            disabled={saving}
                          >
                            <Save className="w-3 h-3 mr-1" /> Save
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                
                <div className="flex gap-2 flex-wrap">
                  {(['Rapido', 'Porter', 'Uber', 'Ola'] as const).filter(
                    c => !competitorPrices.some(p => p.competitor_name === c)
                  ).map((competitor) => (
                    <Button 
                      key={competitor}
                      variant="outline" 
                      size="sm"
                      onClick={() => addCompetitorPrice(competitor, 'bike_taxi')}
                      disabled={saving}
                    >
                      + Add {competitor}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};
