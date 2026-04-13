```javascript

// Import the Input component from the shared UI library
import { Input } from "@/components/ui/input";

// Import DropdownMenuSeparator from the dropdown menu UI component
import { DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

// Import search and clear ("X") icons from Tabler Icons
import { IconSearch, IconX } from "@tabler/icons-react";

// Add a boolean flag to control whether the search input
// should be displayed in the SortableHeader component
type SortableHeaderProps = {
  column: any;
  title: string;
  // Optional: Enables column-specific search functionality
  enableSearch?: boolean;
};

// By default, the search input is disabled
export function SortableHeader({
  column,
  title,
  // Search functionality is disabled unless explicitly enabled
  enableSearch = false,
}: SortableHeaderProps) {
  return (
    ............
    <>
      <DropdownMenuContent align="start" className="z-50 w-56">
      {/* Display the search input only when enableSearch is true */}
      {/* Code location: around line 55 */}
      {enableSearch && (
        <>
          <div className="px-2 py-2">
            <div className="relative">
              {/* Search icon positioned inside the input field */}
              <IconSearch className="text-muted-foreground absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2" />

              {/* Column-specific search input */}
              <Input
                value={(column.getFilterValue() as string) ?? ""}
                onChange={(e) => column.setFilterValue(e.target.value)}
                placeholder={`${title}を検索`}
                className="h-8 w-full pl-7"
              />

              {/* Display a clear button when the input has a value */}
              {(column.getFilterValue() as string) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent triggering parent dropdown events
                    column.setFilterValue(""); // Reset the filter value
                  }}
                  className="absolute top-1/2 right-1.5 z-10 flex h-6 w-6 -translate-y-1/2 
                  items-center justify-center rounded-sm border bg-background text-muted-foreground 
                  hover:text-foreground cursor-pointer"
                  aria-label="検索をクリア"
                >
                  {/* Clear ("X") icon */}
                  <IconX className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Visual separator between the search input and other dropdown menu items */}
          <DropdownMenuSeparator />
        </>
      )}
    </>
  );
}

```
<img width="1593" height="662" alt="Screenshot 2026-04-13 at 10 17 05" src="https://github.com/user-attachments/assets/b209ca73-ea86-4196-be22-b2006e5c5d62" />


## Implementation Details
1. Added the enableSearch property to the SortableHeader component to enable column-specific search functionality.
2. Displayed a search input field within the dropdown menu when the search feature is enabled.
3. Integrated IconSearch and IconX to enhance visual clarity and user interaction.
4. Implemented a clear button to allow users to easily reset the search filter.
5. Added DropdownMenuSeparator to improve UI readability and organization.

## Reasons for Implementation
1. To allow users to quickly search within specific columns.
2. To maintain a clean and simple UI by enabling the search feature only for selected columns.
3. To integrate seamlessly with TanStack Table’s filtering functionality, improving maintainability and reusability.
4. To provide an intuitive and user-friendly experience.




