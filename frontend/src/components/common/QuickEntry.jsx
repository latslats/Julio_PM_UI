import { useState, useRef, useEffect } from 'react'
import { useProjects } from '../../context/ProjectContext'
import { useNotification } from '../../context/NotificationContext'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { FiPlus, FiX, FiClock, FiTarget, FiZap } from 'react-icons/fi'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * QuickEntry component for rapid task creation and manual time entry
 * Supports keyboard shortcuts, auto-complete, and batch operations
 */
const QuickEntry = ({ 
  isOpen, 
  onClose, 
  defaultProjectId = null, 
  mode = 'task' // 'task' | 'time' | 'batch'
}) => {
  const { projects, createTask, createTimeEntry } = useProjects()
  const { showNotification } = useNotification()
  
  const [formData, setFormData] = useState({
    title: '',
    projectId: defaultProjectId || '',
    priority: 'medium',
    estimatedHours: '',
    description: '',
    dueDate: '',
    duration: '', // for manual time entry
    date: new Date().toISOString().split('T')[0] // for manual time entry
  })
  
  const [currentMode, setCurrentMode] = useState(mode)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [batchTasks, setBatchTasks] = useState([''])
  
  const titleInputRef = useRef(null)
  const formRef = useRef(null)

  // Focus input when opened
  useEffect(() => {
    if (isOpen && titleInputRef.current) {
      setTimeout(() => titleInputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!isOpen) return

      switch (event.key) {
        case 'Escape':
          onClose()
          break
        case 'Enter':
          if (event.metaKey || event.ctrlKey) {
            event.preventDefault()
            handleSubmit()
          }
          break
        case 'Tab':
          if (event.shiftKey && currentMode === 'task') {
            event.preventDefault()
            setCurrentMode('time')
          } else if (!event.shiftKey && currentMode === 'time') {
            event.preventDefault() 
            setCurrentMode('batch')
          }
          break
        default:
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, currentMode, onClose])

  // Auto-complete suggestions (mock implementation)
  useEffect(() => {
    if (formData.title.length > 1) {
      // Mock suggestions based on existing task patterns
      const mockSuggestions = [
        `Review ${formData.title}`,
        `Update ${formData.title} documentation`,
        `Test ${formData.title} functionality`,
        `Deploy ${formData.title} changes`
      ].filter(suggestion => 
        suggestion.toLowerCase().includes(formData.title.toLowerCase())
      ).slice(0, 3)
      
      setSuggestions(mockSuggestions)
      setShowSuggestions(mockSuggestions.length > 0)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }, [formData.title])

  // Handle form submission
  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    
    if (!formData.title.trim()) {
      showNotification('error', 'Task title is required')
      return
    }

    if (!formData.projectId) {
      showNotification('error', 'Please select a project')
      return
    }

    setIsSubmitting(true)

    try {
      if (currentMode === 'task') {
        const taskData = {
          title: formData.title.trim(),
          projectId: formData.projectId,
          priority: formData.priority,
          description: formData.description.trim(),
          estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : null,
          dueDate: formData.dueDate || null,
          status: 'not-started'
        }

        const result = await createTask(taskData)
        if (result.success) {
          showNotification('success', `Task "${formData.title}" created successfully`)
          resetForm()
          onClose()
        } else {
          showNotification('error', `Failed to create task: ${result.message}`)
        }
      } else if (currentMode === 'time') {
        if (!formData.duration) {
          showNotification('error', 'Duration is required for time entry')
          return
        }

        const timeData = {
          taskTitle: formData.title.trim(),
          projectId: formData.projectId,
          duration: parseFloat(formData.duration) * 3600, // convert hours to seconds
          date: formData.date,
          description: formData.description.trim()
        }

        const result = await createTimeEntry(timeData)
        if (result.success) {
          showNotification('success', `Time entry for "${formData.title}" created successfully`)
          resetForm()
          onClose()
        } else {
          showNotification('error', `Failed to create time entry: ${result.message}`)
        }
      } else if (currentMode === 'batch') {
        const validTasks = batchTasks.filter(task => task.trim())
        if (validTasks.length === 0) {
          showNotification('error', 'Please add at least one task')
          return
        }

        const results = await Promise.all(
          validTasks.map(title => 
            createTask({
              title: title.trim(),
              projectId: formData.projectId,
              priority: formData.priority,
              status: 'not-started'
            })
          )
        )

        const successful = results.filter(r => r.success).length
        const failed = results.length - successful

        if (successful > 0) {
          showNotification('success', `Created ${successful} tasks successfully${failed > 0 ? ` (${failed} failed)` : ''}`)
          resetForm()
          onClose()
        } else {
          showNotification('error', 'Failed to create any tasks')
        }
      }
    } catch (error) {
      console.error('Error in quick entry:', error)
      showNotification('error', 'An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Reset form
  const resetForm = () => {
    setFormData({
      title: '',
      projectId: defaultProjectId || '',
      priority: 'medium',
      estimatedHours: '',
      description: '',
      dueDate: '',
      duration: '',
      date: new Date().toISOString().split('T')[0]
    })
    setBatchTasks([''])
    setShowSuggestions(false)
  }

  // Handle suggestion selection
  const selectSuggestion = (suggestion) => {
    setFormData(prev => ({ ...prev, title: suggestion }))
    setShowSuggestions(false)
    titleInputRef.current?.focus()
  }

  // Handle batch task changes
  const updateBatchTask = (index, value) => {
    const newTasks = [...batchTasks]
    newTasks[index] = value
    setBatchTasks(newTasks)
  }

  const addBatchTask = () => {
    setBatchTasks(prev => [...prev, ''])
  }

  const removeBatchTask = (index) => {
    if (batchTasks.length > 1) {
      setBatchTasks(prev => prev.filter((_, i) => i !== index))
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-start justify-center pt-[10vh]"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: -20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: -20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl mx-4"
        >
          <Card className="overflow-hidden shadow-xl border-0">
            <CardContent className="p-0">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-primary-50 to-secondary-50">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Button
                      variant={currentMode === 'task' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setCurrentMode('task')}
                      className="h-7 px-3 text-xs"
                    >
                      <FiTarget className="h-3 w-3 mr-1" />
                      Task
                    </Button>
                    <Button
                      variant={currentMode === 'time' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setCurrentMode('time')}
                      className="h-7 px-3 text-xs"
                    >
                      <FiClock className="h-3 w-3 mr-1" />
                      Time
                    </Button>
                    <Button
                      variant={currentMode === 'batch' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setCurrentMode('batch')}
                      className="h-7 px-3 text-xs"
                    >
                      <FiZap className="h-3 w-3 mr-1" />
                      Batch
                    </Button>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {currentMode === 'task' ? 'Quick Task Creation' : 
                     currentMode === 'time' ? 'Manual Time Entry' : 
                     'Batch Task Creation'}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-8 w-8"
                >
                  <FiX className="h-4 w-4" />
                </Button>
              </div>

              {/* Form */}
              <form ref={formRef} onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Project Selection */}
                <div>
                  <label className="text-sm font-medium text-secondary-700 mb-2 block">
                    Project
                  </label>
                  <Select 
                    value={formData.projectId} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, projectId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map(project => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Task Title / Time Entry Title */}
                {currentMode !== 'batch' && (
                  <div className="relative">
                    <label className="text-sm font-medium text-secondary-700 mb-2 block">
                      {currentMode === 'task' ? 'Task Title' : 'Time Entry Description'}
                    </label>
                    <Input
                      ref={titleInputRef}
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder={currentMode === 'task' ? 'What needs to be done?' : 'What did you work on?'}
                      className="text-base"
                    />

                    {/* Auto-complete suggestions */}
                    <AnimatePresence>
                      {showSuggestions && suggestions.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute top-full left-0 right-0 bg-white border border-secondary-200 rounded-md shadow-lg z-10 mt-1"
                        >
                          {suggestions.map((suggestion, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => selectSuggestion(suggestion)}
                              className="w-full text-left px-3 py-2 hover:bg-secondary-50 text-sm first:rounded-t-md last:rounded-b-md"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Batch Tasks */}
                {currentMode === 'batch' && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-secondary-700">
                        Tasks
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={addBatchTask}
                        className="h-6 px-2 text-xs"
                      >
                        <FiPlus className="h-3 w-3 mr-1" />
                        Add
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {batchTasks.map((task, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                            value={task}
                            onChange={(e) => updateBatchTask(index, e.target.value)}
                            placeholder={`Task ${index + 1}`}
                            className="flex-1"
                          />
                          {batchTasks.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeBatchTask(index)}
                              className="h-8 w-8 text-secondary-500 hover:text-red-600"
                            >
                              <FiX className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Additional Fields */}
                <div className="grid grid-cols-2 gap-4">
                  {currentMode === 'task' && (
                    <>
                      <div>
                        <label className="text-sm font-medium text-secondary-700 mb-2 block">
                          Priority
                        </label>
                        <Select 
                          value={formData.priority} 
                          onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-secondary-700 mb-2 block">
                          Estimated Hours
                        </label>
                        <Input
                          type="number"
                          step="0.5"
                          value={formData.estimatedHours}
                          onChange={(e) => setFormData(prev => ({ ...prev, estimatedHours: e.target.value }))}
                          placeholder="2.5"
                        />
                      </div>
                    </>
                  )}

                  {currentMode === 'time' && (
                    <>
                      <div>
                        <label className="text-sm font-medium text-secondary-700 mb-2 block">
                          Duration (hours)
                        </label>
                        <Input
                          type="number"
                          step="0.25"
                          value={formData.duration}
                          onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                          placeholder="1.5"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-secondary-700 mb-2 block">
                          Date
                        </label>
                        <Input
                          type="date"
                          value={formData.date}
                          onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                        />
                      </div>
                    </>
                  )}

                  {currentMode === 'batch' && (
                    <div>
                      <label className="text-sm font-medium text-secondary-700 mb-2 block">
                        Priority (all tasks)
                      </label>
                      <Select 
                        value={formData.priority} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-xs text-secondary-500">
                    <kbd className="px-1 py-0.5 bg-secondary-100 rounded text-xs">⌘ Enter</kbd> to submit • 
                    <kbd className="px-1 py-0.5 bg-secondary-100 rounded text-xs ml-1">Esc</kbd> to close
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={onClose}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="min-w-[80px]"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                          <span>Creating...</span>
                        </div>
                      ) : currentMode === 'batch' ? 'Create Tasks' : 'Create'}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default QuickEntry