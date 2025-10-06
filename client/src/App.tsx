import React from 'react';
import { Router, Route, Switch } from 'wouter';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Router>
        <Switch>
          <Route path="/">
            <div className="flex items-center justify-center h-screen">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                  StackMotive
                </h1>
                <p className="text-lg text-gray-600">
                  Enterprise Portfolio Management Platform
                </p>
              </div>
            </div>
          </Route>
          <Route>
            <div className="flex items-center justify-center h-screen">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                  404 - Page Not Found
                </h1>
              </div>
            </div>
          </Route>
        </Switch>
      </Router>
    </div>
  );
}

export default App;
