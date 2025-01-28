import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import IntervalEstimator from './IntervalEstimator';

function App() {
  return (
    <Router>
      <Switch>
        <Route path="/interval-estimator" component={IntervalEstimator} />
        <Route path="/" exact>
          <div>Hello World</div>
        </Route>
      </Switch>
    </Router>
  );
}

export default App;
