import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from './ui/button';

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check localStorage and system preference
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && systemPrefersDark);
    
    setIsDark(shouldBeDark);
    // Apply both theme-dark class for custom components AND dark class for shadcn
    document.documentElement.classList.toggle('theme-dark', shouldBeDark);
    document.documentElement.classList.toggle('dark', shouldBeDark);
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    
    // Update localStorage
    localStorage.setItem('theme', newIsDark ? 'dark' : 'light');
    
    // Update CSS classes for both custom components and shadcn
    document.documentElement.classList.toggle('theme-dark', newIsDark);
    document.documentElement.classList.toggle('dark', newIsDark);
  };

  return (
    <Button
      onClick={toggleTheme}
      variant="outline"
      size="icon"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {isDark ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  );
}
