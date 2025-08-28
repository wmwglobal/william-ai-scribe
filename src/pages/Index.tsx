import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Users, TrendingUp, Shield, Mic, Brain, Zap, Sparkles, History, Target } from 'lucide-react';

const Index = () => {
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
                Multiple AI Personalities • Memory • Voice
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                Meet AI William
              </h1>
              <p className="text-lg md:text-xl mb-8 text-white/90">
                Experience William MacDonald White's AI twin with multiple personalities—from Entrepreneur to Storyteller. 
                Advanced memory makes every conversation build on the last, with intelligent curiosity triggers that keep discussions engaging.
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
                <div className="w-80 h-80 rounded-full overflow-hidden shadow-elegant bg-white/10 backdrop-blur-sm border border-white/20">
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
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Advanced AI Conversation System</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Multiple personalities, cumulative memory, and intelligent conversation dynamics create truly engaging interactions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="shadow-card">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">6 AI Personalities</h3>
                <p className="text-muted-foreground">
                  Switch between Entrepreneur, Professional, Mentor, Storyteller, Futurist, and Interviewer modes for different conversation styles.
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
                  <Target className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Curiosity Triggers</h3>
                <p className="text-muted-foreground">
                  AI detects ambiguity, missing details, and conversation opportunities to ask engaging follow-up questions.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <MessageCircle className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Voice & Text Chat</h3>
                <p className="text-muted-foreground">
                  Natural voice conversations with advanced speech recognition, text-to-speech, and seamless text input.
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
