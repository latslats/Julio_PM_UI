import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * WaitingListWidget component
 * Shows a summary of waiting items on the dashboard
 */
const WaitingListWidget = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Waiting Items</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-secondary-600 text-sm">No waiting items to display.</p>
      </CardContent>
    </Card>
  );
};

export default WaitingListWidget; 