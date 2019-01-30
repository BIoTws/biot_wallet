import {combineReducers} from "redux";
import {routerReducer} from 'react-router-redux';

import {ModalReducer} from './components/modal/index';

export default combineReducers({
    routing: routerReducer,
    ...ModalReducer
});


