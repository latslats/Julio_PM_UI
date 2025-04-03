import React from 'react';
import { Link } from 'react-router-dom';
import { FiClock, FiCheckCircle, FiArrowRight } from 'react-icons/fi';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

const ProjectCard = ({ project }) => {
  // Calculate completion percentage
  const totalTasks = project.totalTasks || 0
  const completedTasks = project.completedTasks || 0
  const completionPercentage = totalTasks > 0 
    ? Math.round((completedTasks / totalTasks) * 100) 
    : 0

  return (
    <Card className="overflow-hidden transition-shadow duration-200 hover:shadow-lg h-full flex flex-col">
      <CardHeader className="pb-2">
        <Link to={`/projects/${project.id}`} className="block hover:text-primary-600">
          <CardTitle className="text-lg font-semibold truncate">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center shadow-sm inline-block mr-2"
              style={{ 
                backgroundColor: project.color ? `${project.color}15` : '#e0f2fe',
                color: project.color || '#0ea5e9'
              }}
            >
              {project.icon || '📋'}
            </div>
            {project.name}
          </CardTitle>
        </Link>
      </CardHeader>
      <CardContent className="flex-grow pt-2 space-y-3">
        <p className="text-sm text-gray-600 line-clamp-2 min-h-[40px]">
          {project.client || 'Personal Project'}
        </p>
        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Progress</span>
            <span>{completionPercentage}%</span>
          </div>
          <Progress value={completionPercentage} className="h-2" />
        </div>
      </CardContent>
      <CardFooter className="bg-gray-50 text-xs text-gray-500 py-2 px-4 border-t flex justify-between items-center">
        <div className="flex items-center">
          <FiClock className="mr-1" />
          <span>{project.totalHours || 0} hrs</span>
        </div>
        <div className="flex items-center">
          <FiCheckCircle className="mr-1" />
          <span>{completedTasks}/{totalTasks} tasks</span>
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <FiArrowRight className="h-5 w-5 text-primary-500" />
        </div>
      </CardFooter>
    </Card>
  )
}

export default ProjectCard
