import { useState } from 'react'
import { FiAlertCircle, FiPlus, FiBarChart2 } from 'react-icons/fi'
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card"
import { Button } from "../ui/button"
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group"
import WaitingItemCard from '../waitingItems/WaitingItemCard'
import WaitingItemStats from '../waitingItems/WaitingItemStats'

const WaitingItemsTabContent = ({ 
  filteredWaitingItems,
  waitingStats,
  waitingFeaturesAvailable,
  getStatusClass,
  getPriorityClass,
  handleAddWaitingClick
}) => {
  const [showWaitingStats, setShowWaitingStats] = useState(true)
  const [hideCompletedItems, setHideCompletedItems] = useState(true)

  const EmptyState = ({ icon, title, description, action }) => (
    <div className="text-center py-6">
      <div className="mx-auto flex items-center justify-center h-10 w-10 rounded-full bg-secondary-50 text-secondary-400 border border-secondary-100/50">
        {icon}
      </div>
      <h3 className="mt-3 font-medium text-secondary-800 text-sm">{title}</h3>
      <p className="mt-1 text-secondary-500/80 text-xs">{description}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  )

  return (
    <Card className="overflow-hidden border-secondary-100/80 shadow-sm">
      <CardHeader className="pb-3 pt-5 px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base font-medium text-secondary-900">Waiting On</CardTitle>
          <div className="flex items-center mt-2 sm:mt-0 space-x-3">
            {/* Toggle Stats Button - Icon Only */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowWaitingStats(!showWaitingStats)}
              title={showWaitingStats ? "Hide Stats" : "Show Stats"}
              className="h-8 w-8 text-primary/70 hover:text-primary"
            >
              <FiBarChart2 className="h-3.5 w-3.5" />
            </Button>
            {/* Add Item Button */}
            <Button size="sm" variant="outline" onClick={handleAddWaitingClick} className="text-xs">
              <FiPlus className="mr-1.5 h-3.5 w-3.5" />
              <span>Add Item</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-5 space-y-5">
        {/* Stats Section with Animation */}
        <AnimatePresence>
          {showWaitingStats && waitingFeaturesAvailable && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              style={{ overflow: 'hidden' }}
            >
              <WaitingItemStats stats={waitingStats} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filter Toggle */}
        <div className="flex justify-between items-center">
          <span className="text-xs text-secondary-500/80">
            {filteredWaitingItems.length} items
          </span>
          <ToggleGroup
            type="single"
            defaultValue={hideCompletedItems ? "active" : "all"}
            onValueChange={(value) => setHideCompletedItems(value === "active")}
            className="bg-secondary-50/70 p-0.5 rounded-lg"
          >
            <ToggleGroupItem value="active" size="sm" className="text-xs px-3 py-1 rounded">
              Active Only
            </ToggleGroupItem>
            <ToggleGroupItem value="all" size="sm" className="text-xs px-3 py-1 rounded">
              Show All
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Waiting Items List */}
        {filteredWaitingItems && filteredWaitingItems.length > 0 ? (
          <div className="space-y-2">
            {filteredWaitingItems.map(item => (
              <WaitingItemCard
                key={item.id}
                item={item}
                getStatusClass={getStatusClass}
                getPriorityClass={getPriorityClass}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<FiAlertCircle className="h-7 w-7" />}
            title={hideCompletedItems ? "No active waiting items" : "No waiting items"}
            description="Track things you're waiting on others for"
            action={
              <Button size="sm" variant="outline" className="mt-2" onClick={handleAddWaitingClick}>
                Add Item
              </Button>
            }
          />
        )}
      </CardContent>
    </Card>
  )
}

export default WaitingItemsTabContent