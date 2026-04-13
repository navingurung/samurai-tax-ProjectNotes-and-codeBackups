```javascript
// import Input UI from ui component
import { Input } from "@/components/ui/input";

// import dropdownMenuSeparator from drop-menu ui component
import {DropdownMenuSeparator} from "@/components/ui/dropdown-menu";


// import search and clear "X" icons from tabler
import {  IconSearch,IconX} from "@tabler/icons-react";

// add bolean for enable Search input or not on SortableHeaders
type SortableHeaderProps = {
  column: any;
  title: string;
  // 検索機能を有効にするかどうかのフラグ（オプション）
  enableSearch?: boolean;
};


// Default will be false of Search Input
export function SortableHeader({
  column,
  title,
  // デフォルトでは検索機能を無効にする
  enableSearch = false,
}: SortableHeaderProps) {}

// if enableSearch then display inputs

 return (
{/* 検索機能が有効な場合、検索入力フィールドを表示 */}
// code lines : 55
        {enableSearch && (
          <>
            <div className="px-2 py-2">
              <div className="relative">
                <IconSearch className="text-muted-foreground absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2" />
                <Input
                  value={(column.getFilterValue() as string) ?? ""}
                  onChange={(e) => column.setFilterValue(e.target.value)}
                  placeholder={`${title}を検索`}
                  className="h-8 pl-7 w-full"
                />
                {/* Added: clear button when input has value */}
                {(column.getFilterValue() as string) && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      column.setFilterValue("");
                    }}
                    className="absolute top-1/2 right-1.5 z-10 flex h-6 w-6 -translate-y-1/2 
                    items-center justify-center rounded-sm border bg-background text-muted-foreground 
                    hover:text-foreground cursor-pointer"
                    aria-label="検索をクリア"
                  >
                    <IconX className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
            <DropdownMenuSeparator />
          </>
        )}

)
```
<img width="1596" height="665" alt="Screenshot 2026-04-13 at 10 06 13" src="https://github.com/user-attachments/assets/b4c03f7f-1a66-40ce-a410-51bb18f3fecf" />
