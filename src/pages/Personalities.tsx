import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, ArrowLeft, Users, Lightbulb, Target, BookOpen, Zap, MessageSquare, Sparkles } from 'lucide-react';

const personalities = [
  {
    id: 'entrepreneur',
    name: 'Entrepreneur',
    icon: Lightbulb,
    gradient: 'from-blue-500 to-indigo-600',
    description: 'Strategic business thinking and innovation',
    traits: ['Business Strategy', 'Innovation', 'Market Analysis', 'Growth Planning'],
    details: 'The Entrepreneur persona brings decades of business experience to every conversation. From startup strategies to scaling enterprises, this mode focuses on practical business wisdom, market insights, and strategic thinking.',
    accentColor: 'bg-blue-500'
  },
  {
    id: 'professional',
    name: 'Professional',
    icon: Target,
    gradient: 'from-emerald-500 to-green-600',
    description: 'Corporate expertise and professional guidance',
    traits: ['Leadership', 'Project Management', 'Team Building', 'Corporate Strategy'],
    details: 'The Professional persona embodies executive-level thinking and corporate best practices. Ideal for leadership discussions, organizational challenges, and professional development conversations.',
    accentColor: 'bg-emerald-500'
  },
  {
    id: 'mentor',
    name: 'Mentor',
    icon: Users,
    gradient: 'from-purple-500 to-violet-600',
    description: 'Guidance, wisdom, and personal development',
    traits: ['Personal Growth', 'Career Advice', 'Life Wisdom', 'Goal Setting'],
    details: 'The Mentor persona focuses on personal and professional development. Drawing from years of experience helping others succeed, this mode provides thoughtful guidance and actionable insights.',
    accentColor: 'bg-purple-500'
  },
  {
    id: 'storyteller',
    name: 'Storyteller',
    icon: BookOpen,
    gradient: 'from-orange-500 to-red-600',
    description: 'Narrative thinking and creative communication',
    traits: ['Storytelling', 'Creative Thinking', 'Communication', 'Narrative Structure'],
    details: 'The Storyteller persona brings ideas to life through compelling narratives and creative communication. Perfect for exploring concepts through stories, analogies, and engaging examples.',
    accentColor: 'bg-orange-500'
  },
  {
    id: 'futurist',
    name: 'Futurist',
    icon: Zap,
    gradient: 'from-cyan-500 to-blue-600',
    description: 'Technology trends and future possibilities',
    traits: ['Technology Trends', 'Future Planning', 'Innovation', 'Strategic Foresight'],
    details: 'The Futurist persona explores emerging technologies, market trends, and future possibilities. Ideal for discussing innovation, technology strategy, and preparing for tomorrow\'s opportunities.',
    accentColor: 'bg-cyan-500'
  },
  {
    id: 'interviewer',
    name: 'Interviewer',
    icon: MessageSquare,
    gradient: 'from-pink-500 to-rose-600',
    description: 'Deep questions and thoughtful exploration',
    traits: ['Deep Questions', 'Active Listening', 'Curiosity', 'Insight Discovery'],
    details: 'The Interviewer persona excels at asking thoughtful questions and uncovering insights. This mode is perfect for exploring complex topics, discovering new perspectives, and deep conversations.',
    accentColor: 'bg-pink-500'
  }
];

const Personalities = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background/90 backdrop-blur-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Link>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <Brain className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-bold text-lg">AI Personalities</span>
              </div>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <Link to="/admin" className="text-muted-foreground hover:text-foreground transition-colors">
                Dashboard
              </Link>
              <Link to="/chat">
                <Button>Start Chatting</Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-background via-muted/20 to-background">
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="secondary" className="mb-6">
            <Sparkles className="w-4 h-4 mr-2" />
            6 Unique AI Personalities
          </Badge>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            Designed for every conversation
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Each personality brings unique expertise, communication style, and thinking patterns to create the perfect conversation experience for your needs.
          </p>
        </div>
      </section>

      {/* Personalities Grid */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {personalities.map((personality, index) => (
              <Card 
                key={personality.id} 
                className="group hover:shadow-elegant transition-all duration-500 hover:-translate-y-2 animate-fade-in border-muted/50 hover:border-primary/20"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-0">
                  {/* Header with gradient */}
                  <div className={`bg-gradient-to-br ${personality.gradient} p-6 text-white relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-black/10"></div>
                    <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                          <personality.icon className="w-5 h-5" />
                        </div>
                        <h3 className="text-xl font-semibold">{personality.name}</h3>
                      </div>
                      <p className="text-white/90 text-sm leading-relaxed">
                        {personality.description}
                      </p>
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="p-6">
                    <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
                      {personality.details}
                    </p>
                    
                    {/* Traits */}
                    <div className="space-y-2 mb-6">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Key Strengths
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {personality.traits.map((trait) => (
                          <Badge 
                            key={trait} 
                            variant="secondary" 
                            className="text-xs bg-muted/50 hover:bg-muted transition-colors"
                          >
                            {trait}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    {/* CTA */}
                    <Link to="/chat" className="block">
                      <Button 
                        className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-300 shadow-sm hover:shadow-md"
                        size="sm"
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Chat as {personality.name}
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Switch seamlessly between personalities
          </h2>
          <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
            Each conversation builds on the last, with memory that spans across personalities. 
            Start as an Entrepreneur, switch to Mentor, and return to any personality with full context intact.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Brain className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Persistent Memory</h3>
              <p className="text-sm text-muted-foreground">
                Conversations continue seamlessly across personality switches
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Instant Switching</h3>
              <p className="text-sm text-muted-foreground">
                Change personalities mid-conversation for different perspectives
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Target className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Contextual Awareness</h3>
              <p className="text-sm text-muted-foreground">
                Each personality understands the full conversation history
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to start your conversation?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Choose your starting personality and begin an intelligent conversation that adapts to your needs.
          </p>
          <Link to="/chat">
            <Button size="lg" className="shadow-glow">
              <Brain className="w-5 h-5 mr-2" />
              Start Conversation
            </Button>
          </Link>
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
              <Link to="/admin" className="hover:text-foreground transition-colors">Dashboard</Link>
              <span>© 2025 WMW Global Technologies Inc. All rights reserved.</span>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Personalities;