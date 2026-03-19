import '@fontsource/jetbrains-mono';
import './styles/main.css';
import { App } from './App';

const root = document.getElementById('app');
if (root) {
  new App(root);
}
