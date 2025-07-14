"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Code2, 
  Database, 
  Globe, 
  Smartphone, 
  Cloud, 
  Palette,
  Settings,
  GitBranch
} from "lucide-react";

const SkillsSection = () => {
  console.log("SkillsSection component rendered");

  const skillCategories = [
    {
      icon: Code2,
      title: "Frontend Development",
      color: "from-blue-500 to-cyan-500",
      skills: [
        { name: "React/Next.js", level: 95 },
        { name: "TypeScript", level: 90 },
        { name: "Tailwind CSS", level: 88 },
        { name: "JavaScript", level: 92 }
      ]
    },
    {
      icon: Database,
      title: "Backend Development",
      color: "from-green-500 to-emerald-500",
      skills: [
        { name: "Node.js", level: 85 },
        { name: "Python", level: 80 },
        { name: "PostgreSQL", level: 82 },
        { name: "GraphQL", level: 75 }
      ]
    },
    {
      icon: Cloud,
      title: "Cloud & DevOps",
      color: "from-purple-500 to-pink-500",
      skills: [
        { name: "AWS", level: 78 },
        { name: "Docker", level: 82 },
        { name: "Vercel", level: 90 },
        { name: "CI/CD", level: 75 }
      ]
    },
    {
      icon: Palette,
      title: "Design & UX",
      color: "from-orange-500 to-red-500",
      skills: [
        { name: "Figma", level: 85 },
        { name: "UI/UX Design", level: 80 },
        { name: "Responsive Design", level: 92 },
        { name: "Prototyping", level: 78 }
      ]
    }
  ];

  const tools = [
    "Visual Studio Code", "Git", "Figma", "Postman", "Docker", "Slack",
    "Notion", "Chrome DevTools", "Vercel", "GitHub", "Linear", "Framer"
  ];

  const technologies = [
    { name: "React", category: "Frontend" },
    { name: "Next.js", category: "Framework" },
    { name: "TypeScript", category: "Language" },
    { name: "Node.js", category: "Backend" },
    { name: "Python", category: "Language" },
    { name: "PostgreSQL", category: "Database" },
    { name: "MongoDB", category: "Database" },
    { name: "AWS", category: "Cloud" },
    { name: "Docker", category: "DevOps" },
    { name: "GraphQL", category: "API" },
    { name: "REST APIs", category: "API" },
    { name: "Tailwind CSS", category: "Styling" },
  ];

  return (
    <section id="skills" className="py-24 relative overflow-hidden bg-muted/30">
      {/* Background Elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/3 left-0 w-72 h-72 bg-luxury-gold/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/3 w-96 h-96 bg-luxury-gold/5 rounded-full blur-3xl" />
      </div>

      <div className="section-padding">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Technical <span className="text-gradient">Skills</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              A comprehensive toolkit of modern technologies and frameworks to bring ideas to life.
            </p>
          </motion.div>

          {/* Skill Categories */}
          <div className="grid md:grid-cols-2 gap-8 mb-20">
            {skillCategories.map((category, index) => (
              <motion.div
                key={category.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="glass-card border-luxury-gold/20 hover:border-luxury-gold/40 transition-all duration-300 h-full">
                  <CardContent className="p-8">
                    <div className="flex items-center mb-6">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${category.color} flex items-center justify-center mr-4`}>
                        <category.icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-xl font-semibold">{category.title}</h3>
                    </div>
                    
                    <div className="space-y-4">
                      {category.skills.map((skill, skillIndex) => (
                        <motion.div
                          key={skill.name}
                          initial={{ opacity: 0, x: -20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.4, delay: (index * 0.1) + (skillIndex * 0.05) }}
                          viewport={{ once: true }}
                          className="space-y-2"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{skill.name}</span>
                            <span className="text-sm text-muted-foreground">{skill.level}%</span>
                          </div>
                          <Progress 
                            value={skill.level} 
                            className="h-2 bg-muted"
                          />
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Technologies */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <h3 className="text-2xl font-semibold text-center mb-8">Technologies & Frameworks</h3>
            <div className="flex flex-wrap justify-center gap-3">
              {technologies.map((tech, index) => (
                <motion.div
                  key={tech.name}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: index * 0.03 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.05, y: -2 }}
                  className="group"
                >
                  <Badge 
                    variant="secondary" 
                    className="px-4 py-2 text-sm bg-luxury-gold/10 text-luxury-gold border-luxury-gold/20 hover:bg-luxury-gold/20 transition-all duration-300 cursor-default"
                  >
                    {tech.name}
                    <span className="ml-2 text-xs opacity-60">{tech.category}</span>
                  </Badge>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Tools */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h3 className="text-2xl font-semibold text-center mb-8">Development Tools</h3>
            <div className="flex flex-wrap justify-center gap-3">
              {tools.map((tool, index) => (
                <motion.div
                  key={tool}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: index * 0.03 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.05, y: -2 }}
                >
                  <Badge 
                    variant="outline" 
                    className="px-4 py-2 text-sm border-luxury-gold/30 text-foreground hover:border-luxury-gold hover:bg-luxury-gold/10 transition-all duration-300 cursor-default"
                  >
                    {tool}
                  </Badge>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default SkillsSection;