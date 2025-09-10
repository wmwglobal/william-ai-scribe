import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { MessageCircle, Users, TrendingUp, Shield, Mic, Brain, Zap, Sparkles, History, Target, Calendar, FileText, CheckSquare, Lightbulb, ArrowRight, Mail, Heart, Home, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter your email address to join the waitlist.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('collect_email', {
        body: {
          email: email.trim(),
          name: name.trim() || undefined,
          signup_type: 'waitlist'
        }
      });

      if (error) {
        throw error;
      }

      const response = data;
      
      if (response.success) {
        setIsSuccess(true);
        setEmail('');
        setName('');
        
        toast({
          title: "Welcome to the waitlist!",
          description: response.message,
        });
      } else {
        throw new Error(response.error || 'Failed to join waitlist');
      }
    } catch (error) {
      console.error('Signup error:', error);
      toast({
        title: "Signup failed",
        description: error instanceof Error ? error.message : "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <header className="bg-background/90 backdrop-blur-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <Brain className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg">William MacDonald White</span>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <Link to="/personalities" className="text-muted-foreground hover:text-foreground transition-colors">
                Personalities
              </Link>
              <Link to="/admin" className="text-muted-foreground hover:text-foreground transition-colors">
                Dashboard
              </Link>
              <Link to="/chat">
                <Button>Chat with AI William</Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Text Content */}
            <div className="text-center lg:text-left text-white">
              <Badge variant="secondary" className="mb-6 text-primary bg-white/20">
                Adaptive Personalities • Philosophical Depth • Memory • Voice
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                Meet AI William
              </h1>
              <p className="text-lg md:text-xl mb-8 text-white/90">
                Experience William MacDonald White's AI twin with sophisticated conversation capabilities—from business strategy to philosophical depth. 
                Advanced memory, adaptive personality, and intelligent conversation dynamics create genuinely engaging interactions.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link to="/chat">
                  <Button size="lg" className="w-full sm:w-auto shadow-glow bg-white text-primary hover:bg-white/90">
                    <Brain className="w-5 h-5 mr-2" />
                    Start Conversation
                  </Button>
                </Link>
                <Link to="/personalities">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto bg-white/10 border-white/20 text-white hover:bg-white/20">
                    <Sparkles className="w-5 h-5 mr-2" />
                    See Personalities
                  </Button>
                </Link>
              </div>
            </div>
            
            {/* Right Column - William's Image */}
            <div className="flex justify-center lg:justify-end">
              <div className="relative">
                <div className="w-80 h-80 rounded-xl overflow-hidden shadow-elegant bg-white/10 backdrop-blur-sm border border-white/20">
                  <img 
                    src="/lovable-uploads/2e29baeb-3566-403b-86f3-1d1cffcd52ed.png" 
                    alt="William White - AI Consultant and Business Expert"
                    className="w-full h-full object-cover object-center"
                    style={{ objectPosition: '40% 15%' }}
                  />
                </div>
                <div className="absolute -bottom-4 -right-4 w-16 h-16 rounded-full bg-primary flex items-center justify-center shadow-glow">
                  <Brain className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Next-Generation AI Conversation System</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Adaptive personalities, philosophical depth, comedy timing, and cumulative memory create conversations that feel genuinely human.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="shadow-card">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Adaptive AI Personalities</h3>
                <p className="text-muted-foreground">
                  Dynamic personality system with Entrepreneur, Professional, Mentor, Storyteller, Futurist, and Interviewer modes that adapt to conversation context.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <History className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Cumulative Memory</h3>
                <p className="text-muted-foreground">
                  AI remembers your conversations across sessions, building context and understanding over time for truly personalized interactions.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Smart Summaries</h3>
                <p className="text-muted-foreground">
                  Automatically generates comprehensive summaries of your conversations, capturing key insights, decisions, and next steps.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <CheckSquare className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Action Items</h3>
                <p className="text-muted-foreground">
                  Identifies and tracks actionable tasks from conversations, with priority scoring and follow-up reminders.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Calendar className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Calendar Integration</h3>
                <p className="text-muted-foreground">
                  Seamlessly schedules meetings, sets reminders, and manages your calendar based on conversation context.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Target className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Intelligent Conversation Flow</h3>
                <p className="text-muted-foreground">
                  Advanced curiosity detection, conversation timing, and philosophical depth create naturally engaging dialogues with perfect pacing.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <MessageCircle className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Natural Voice Conversations</h3>
                <p className="text-muted-foreground">
                  Sophisticated speech with perfect timing, natural pauses, and comedy elements. Advanced recognition and seamless text integration.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Smart Analytics</h3>
                <p className="text-muted-foreground">
                  Lead scoring, intent detection, and conversation insights help identify opportunities and improve interactions.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Brain className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Philosophical Depth</h3>
                <p className="text-muted-foreground">
                  Engages with complex questions about consciousness, meaning, and existence using computational metaphors and genuine introspection.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Privacy First</h3>
                <p className="text-muted-foreground">
                  GDPR-compliant with explicit consent, data retention controls, and transparent privacy policies.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Upsell Section */}
      <section className="py-20 bg-gradient-subtle">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-12">
            <Badge variant="secondary" className="mb-6">
              <Lightbulb className="w-4 h-4 mr-2" />
              Custom AI Agents
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Want Your Own AI Agent?
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Imagine having an AI version of yourself that can handle conversations, manage your family's schedule, 
              coordinate activities, and be there when you can't be. Perfect for busy professionals, parents, 
              consultants, and anyone who wants to help more people while maintaining balance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Your Personality</h3>
              <p className="text-muted-foreground text-sm">Trained on your content, speaking style, and expertise</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Family Support</h3>
              <p className="text-muted-foreground text-sm">Help your family when you're traveling or in meetings</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Schedule Management</h3>
              <p className="text-muted-foreground text-sm">Coordinate family calendars, appointments, and activities</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Always Available</h3>
              <p className="text-muted-foreground text-sm">24/7 support for work inquiries and family needs</p>
            </div>
          </div>

          <div className="bg-muted/30 rounded-xl p-8 mb-12">
            <h3 className="text-xl font-semibold mb-4 flex items-center justify-center">
              <Home className="w-5 h-5 mr-2" />
              Perfect for Modern Families
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left max-w-3xl mx-auto">
              <div>
                <h4 className="font-semibold mb-2">For Parents:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Answer kids' questions when you're at work</li>
                  <li>• Coordinate school schedules and activities</li>
                  <li>• Share your wisdom and guidance 24/7</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">For Professionals:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Handle client inquiries during family time</li>
                  <li>• Scale your expertise without working more</li>
                  <li>• Maintain work-life balance with AI support</li>
                </ul>
              </div>
            </div>
          </div>

          <Card className="max-w-md mx-auto shadow-elegant">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold mb-4">Request Early Access</h3>
              <p className="text-muted-foreground mb-6">
                Join the waitlist for custom AI agents. We'll contact you with more details.
              </p>
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-3">
                  <Input
                    type="text"
                    placeholder="Your name (optional)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isLoading}
                  />
                  <Input
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full shadow-glow" 
                  disabled={isLoading || isSuccess}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Joining...
                    </>
                  ) : isSuccess ? (
                    <>
                      <CheckSquare className="w-4 h-4 mr-2" />
                      Added to Waitlist!
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Join Waitlist
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  No spam, just updates on availability and pricing.
                </p>
              </form>
            </CardContent>
          </Card>

          <div className="mt-8">
            <Link to="/chat" className="inline-flex items-center text-primary hover:text-primary/80 transition-colors">
              Try AI William first <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>
      </section>


      {/* Footer */}
      <footer className="bg-card border-t py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                <Brain className="w-3 h-3 text-primary-foreground" />
              </div>
              <span className="font-semibold">William White AI</span>
            </div>
            <nav className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
              <Link to="/personalities" className="hover:text-foreground transition-colors">Personalities</Link>
              <Link to="/admin" className="hover:text-foreground transition-colors">Dashboard</Link>
              <span>© 2025 WMW Global Technologies Inc. All rights reserved.</span>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
