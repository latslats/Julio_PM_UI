import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiClock, FiCheckCircle, FiArrowRight } from 'react-icons/fi';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

/**
 * ProjectCard component displays a project summary in a card format
 * Enhanced with animations and improved accessibility
 * Optimized with React.memo for performance
 * 
 * @param {Object} project - The project data to display
 * @returns {JSX.Element} - The rendered project card
 */
const ProjectCard = React.memo(({ project }) => {
  const [isHovered, setIsHovered] = useState(false);
  // Calculate completion percentage
  const totalTasks = project.totalTasks || 0
  const completedTasks = project.completedTasks || 0
  const completionPercentage = totalTasks > 0 
    ? Math.round((completedTasks / totalTasks) * 100) 
    : 0

  return (
    <Card 
      className="overflow-hidden transition-all duration-300 hover:shadow-lg h-full flex flex-col animate-fade-in hover:translate-y-[-2px]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
    >
      <CardHeader className="pb-2">
        <Link 
          to={`/projects/${project.id}`} 
          className="block hover:text-primary-600 focus-visible:outline-none"
          aria-label={`View details for project: ${project.name}`}
        >
          <CardTitle className="text-lg font-semibold truncate">
            <div 
              className={`w-12 h-12 rounded-full flex items-center justify-center shadow-sm inline-block mr-2 transition-all duration-300 ${isHovered ? 'scale-110' : ''}`}
              style={{ 
                backgroundColor: project.color ? `${project.color}${isHovered ? '25' : '15'}` : '#e0f2fe',
                color: project.color || '#0ea5e9'
              }}
              aria-hidden="true"
            >
              {project.icon || '📋'}
            </div>
            <span className="transition-colors duration-200">{project.name}</span>
          </CardTitle>
        </Link>
      </CardHeader>
      <CardContent className="flex-grow pt-2 space-y-3">
        <p className="text-sm text-gray-600 line-clamp-2 min-h-[40px] transition-opacity duration-200" style={{ opacity: isHovered ? 1 : 0.9 }}>
          {project.client || 'Personal Project'}
        </p>
        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Progress</span>
            <span className="font-medium transition-all duration-200" style={{ color: isHovered ? (project.color || '#0ea5e9') : '' }}>
              {completionPercentage}%
            </span>
          </div>
          <Progress 
            value={completionPercentage} 
            className="h-2 transition-all duration-300" 
            indicatorColor={isHovered ? `bg-[${project.color || '#0ea5e9'}]` : ''}
            aria-label={`Project completion: ${completionPercentage}%`}
          />
        </div>
      </CardContent>
      <CardFooter className="bg-gray-50 text-xs text-gray-500 py-2 px-4 border-t flex justify-between items-center transition-colors duration-300" style={{ backgroundColor: isHovered ? '#f8fafc' : '#f9fafb' }}>
        <div className="flex items-center transition-transform duration-200" style={{ transform: isHovered ? 'scale(1.05)' : 'scale(1)' }}>
          <FiClock className="mr-1" aria-hidden="true" />
          <span>{project.totalHours || 0} hrs</span>
        </div>
        <div className="flex items-center transition-transform duration-200" style={{ transform: isHovered ? 'scale(1.05)' : 'scale(1)' }}>
          <FiCheckCircle className="mr-1" aria-hidden="true" />
          <span>{completedTasks}/{totalTasks} tasks</span>
        </div>
        <div className={`transition-all duration-300 ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}`}>
          <FiArrowRight className="h-5 w-5 text-primary-500" aria-hidden="true" />
        </div>
      </CardFooter>
    </Card>
  )
})

ProjectCard.displayName = 'ProjectCard'

export default ProjectCard
