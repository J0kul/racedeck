import { Route, Switch } from "wouter";
import Index from "./pages/index";
import LobbyPage from "./pages/lobby";
import GamePage from "./pages/game";
import { Provider } from "./components/provider";
import { AgentFeedback, RunableBadge } from "@runablehq/website-runtime";

function App() {
  return (
    <Provider>
      <Switch>
        <Route path="/" component={Index} />
        <Route path="/lobby" component={LobbyPage} />
        <Route path="/game/:id" component={GamePage} />
        <Route>
          <div className="flex h-screen items-center justify-center bg-bg-900 text-ink-dim">
            Page not found
          </div>
        </Route>
      </Switch>
      {import.meta.env.DEV && <AgentFeedback />}
      {<RunableBadge />}
    </Provider>
  );
}

export default App;
