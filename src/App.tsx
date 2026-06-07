import React from "react";
import "./App.scss";
import { Main } from "./components/Main";
import { Provider as ReduxProvider } from "react-redux";
import { store } from "./store";
import { DebugOverlay } from "./components/Area/DebugOverlay";

import "./store/language/translations";
import { Day9 } from "./Day9/Day9";
import "bbuutoonnss/dist/bbuutoonnss.css";

const App: React.FC = () => (
  <ReduxProvider store={store}>
    <Main />
    <DebugOverlay />
  </ReduxProvider>
);

export default App;
