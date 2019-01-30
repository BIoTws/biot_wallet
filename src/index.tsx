import * as React from "react";
import * as ReactDOM from "react-dom";
import getBiot from './getBiot';

import {App} from "./components/App";

import "./styles/style.scss";

const ROOT = document.querySelector(".container");

ReactDOM.render(<App/>, ROOT);

