// Version autonome : React est embarqué dans la page (pas d'accès internet requis).
import React from 'react';
import * as ReactDOMBase from 'react-dom';
import * as ReactDOMClient from 'react-dom/client';
window.React = React;
window.ReactDOM = { ...ReactDOMBase, ...ReactDOMClient };
