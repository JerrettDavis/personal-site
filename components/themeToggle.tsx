import styled from "@emotion/styled";
import { useState, useEffect } from "react";

const ToggleButton = styled.button`
  --toggle-width: 64px;
  --toggle-height: 32px;
  --toggle-padding: 4px;
  color: var(--color-text-primary);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-around;
  font-size: 1rem;
  line-height: 1;
  width: var(--toggle-width);
  height: var(--toggle-height);
  padding: var(--toggle-padding);
  border: 0;
  border-radius: calc(var(--toggle-width) / 2);
  cursor: pointer;
  background: var(--color-bg-toggle);
  transition: background 0.25s ease-in-out, box-shadow 0.25s ease-in-out;
  &:focus {
    outline-offset: 5px;
  }
  &:focus:not(:focus-visible) {
    outline: none;
  }
  &:hover {
    box-shadow: 0 0 5px 2px var(--color-bg-toggle);
  },
`;

const ToggleThumb = styled.span`
  position: absolute;
  top: var(--toggle-padding);
  left: var(--toggle-padding);
  width: calc(var(--toggle-height) - (var(--toggle-padding) * 2));
  height: calc(var(--toggle-height) - (var(--toggle-padding) * 2));
  border-radius: 50%;
  background: var(--color-bg-thumb);
  transition: transform 0.25s ease-in-out, background 0.25s ease-in-out;
  transform: ${(p: {activeTheme: string}) =>
          p.activeTheme === "dark"
                  ? "translate3d(calc(var(--toggle-width) - var(--toggle-height)), 0, 0)"
                  : "none"};
`;

export default function ThemeToggle() {
    const [activeTheme, setActiveTheme] = useState(document.body.dataset.theme);
    const inactiveTheme = activeTheme === "light" ? "dark" : "light";

    useEffect(() => {
        document.body.dataset.theme = activeTheme;
        window.localStorage.setItem("theme", activeTheme);
    }, [activeTheme]);
    return (
        <ToggleButton type="button"
                      aria-label={`Change to ${inactiveTheme} mode`}
                      title={`Change to ${inactiveTheme} mode`}
                      onClick={() => setActiveTheme(inactiveTheme)}
        >
            <ToggleThumb activeTheme={activeTheme} />
            <span aria-hidden={true}>🌙</span>
            <span aria-hidden={true}>☀️</span>
        </ToggleButton>
    );
};
