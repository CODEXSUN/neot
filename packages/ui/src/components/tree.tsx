"use client";

import { ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";

import { cn } from "../lib/utils";

export type TreeNodeData = {
  children?: TreeNodeData[];
  hasChildren?: boolean;
  label: ReactNode;
  meta?: Record<string, unknown>;
  value: string;
};

export type TreeExpandedState = Record<string, boolean>;

export type CheckedNodeStatus = {
  checked: boolean;
  indeterminate: boolean;
  node: TreeNodeData;
};

export type TreeController = {
  anchorNode: string | null;
  checkAllNodes: () => void;
  checkedState: string[];
  checkNode: (value: string) => void;
  checkStrictly: boolean;
  clearSelected: () => void;
  collapse: (value: string) => void;
  collapseAllNodes: () => void;
  deselect: (value: string) => void;
  expand: (value: string) => void;
  expandAllNodes: () => void;
  expandedState: TreeExpandedState;
  getCheckedNodes: () => CheckedNodeStatus[];
  getNodeLoadError: (value: string) => Error | null;
  initialize: (data: TreeNodeData[]) => void;
  invalidateNode: (value: string) => void;
  isNodeChecked: (value: string) => boolean;
  isNodeIndeterminate: (value: string) => boolean;
  isNodeLoading: (value: string) => boolean;
  loadNode: (value: string) => Promise<void>;
  multiple: boolean;
  select: (value: string) => void;
  selectedState: string[];
  setCheckedState: React.Dispatch<React.SetStateAction<string[]>>;
  setExpandedState: React.Dispatch<React.SetStateAction<TreeExpandedState>>;
  setSelectedState: React.Dispatch<React.SetStateAction<string[]>>;
  toggleExpanded: (value: string) => void;
  toggleSelected: (value: string) => void;
  uncheckAllNodes: () => void;
  uncheckNode: (value: string) => void;
};

export type RenderTreeNodePayload = {
  dragHandleProps: { onMouseDown: (event: React.MouseEvent) => void } | undefined;
  elementProps: {
    className: string;
    "data-selected": boolean | undefined;
    "data-value": string;
    onClick: (event: React.MouseEvent) => void;
    style: CSSProperties;
  };
  expanded: boolean;
  hasChildren: boolean;
  isLoading: boolean;
  isRoot: boolean;
  level: number;
  loadError: Error | null;
  node: TreeNodeData;
  selected: boolean;
  tree: TreeController;
};

type TreeIndex = {
  descendants: Map<string, string[]>;
  nodes: Map<string, TreeNodeData>;
  parent: Map<string, string | null>;
  values: string[];
};

export function useTree({
  checkedState,
  checkStrictly = false,
  expandedState,
  initialCheckedState,
  initialExpandedState,
  initialSelectedState,
  multiple = false,
  onCheckedStateChange,
  onExpandedStateChange,
  onLoadChildren,
  onNodeCollapse,
  onNodeExpand,
  onSelectedStateChange,
  selectedState
}: {
  checkedState?: string[];
  checkStrictly?: boolean;
  expandedState?: TreeExpandedState;
  initialCheckedState?: string[];
  initialExpandedState?: TreeExpandedState;
  initialSelectedState?: string[];
  multiple?: boolean;
  onCheckedStateChange?: (state: string[]) => void;
  onExpandedStateChange?: (state: TreeExpandedState) => void;
  onLoadChildren?: (nodeValue: string) => Promise<void>;
  onNodeCollapse?: (value: string) => void;
  onNodeExpand?: (value: string) => void;
  onSelectedStateChange?: (state: string[]) => void;
  selectedState?: string[];
} = {}): TreeController {
  const [innerExpandedState, setInnerExpandedState] = useState<TreeExpandedState>(
    initialExpandedState ?? {}
  );
  const [innerSelectedState, setInnerSelectedState] = useState<string[]>(
    initialSelectedState ?? []
  );
  const [innerCheckedState, setInnerCheckedState] = useState<string[]>(initialCheckedState ?? []);
  const [index, setIndex] = useState<TreeIndex>(() => createTreeIndex([]));
  const [initializedSignature, setInitializedSignature] = useState("");
  const [loadingState, setLoadingState] = useState<Record<string, boolean>>({});
  const [loadErrorState, setLoadErrorState] = useState<Record<string, Error | null>>({});
  const [loadedState, setLoadedState] = useState<Record<string, boolean>>({});
  const [anchorNode, setAnchorNode] = useState<string | null>(null);
  const resolvedExpanded = expandedState ?? innerExpandedState;
  const resolvedSelected = selectedState ?? innerSelectedState;
  const resolvedChecked = checkedState ?? innerCheckedState;

  function setExpanded(next: React.SetStateAction<TreeExpandedState>) {
    const nextState = typeof next === "function" ? next(resolvedExpanded) : next;
    if (expandedState === undefined) setInnerExpandedState(nextState);
    onExpandedStateChange?.(nextState);
  }

  function setSelected(next: React.SetStateAction<string[]>) {
    const nextState = typeof next === "function" ? next(resolvedSelected) : next;
    if (selectedState === undefined) setInnerSelectedState(nextState);
    onSelectedStateChange?.(nextState);
  }

  function setChecked(next: React.SetStateAction<string[]>) {
    const nextState = uniqueValues(typeof next === "function" ? next(resolvedChecked) : next);
    if (checkedState === undefined) setInnerCheckedState(nextState);
    onCheckedStateChange?.(nextState);
  }

  function checkedWithDescendants(value: string) {
    return uniqueValues([value, ...(checkStrictly ? [] : (index.descendants.get(value) ?? []))]);
  }

  async function loadNode(value: string) {
    if (!onLoadChildren || loadedState[value] || loadingState[value]) return;
    setLoadingState((current) => ({ ...current, [value]: true }));
    setLoadErrorState((current) => ({ ...current, [value]: null }));
    try {
      await onLoadChildren(value);
      setLoadedState((current) => ({ ...current, [value]: true }));
    } catch (error) {
      setLoadErrorState((current) => ({
        ...current,
        [value]: error instanceof Error ? error : new Error("Unable to load tree node")
      }));
    } finally {
      setLoadingState((current) => ({ ...current, [value]: false }));
    }
  }

  return {
    anchorNode,
    checkAllNodes: () => setChecked(index.values),
    checkedState: resolvedChecked,
    checkNode: (value) =>
      setChecked((current) => uniqueValues([...current, ...checkedWithDescendants(value)])),
    checkStrictly,
    clearSelected: () => setSelected([]),
    collapse: (value) => {
      setExpanded((current) => ({ ...current, [value]: false }));
      onNodeCollapse?.(value);
    },
    collapseAllNodes: () => setExpanded({}),
    deselect: (value) => setSelected((current) => current.filter((item) => item !== value)),
    expand: (value) => {
      setExpanded((current) => ({ ...current, [value]: true }));
      onNodeExpand?.(value);
      void loadNode(value);
    },
    expandAllNodes: () =>
      setExpanded(
        getTreeExpandedState(
          Array.from(index.nodes.values()).filter((node) => index.parent.get(node.value) === null),
          "*"
        )
      ),
    expandedState: resolvedExpanded,
    getCheckedNodes: () =>
      Array.from(index.nodes.values()).map((node) => ({
        checked: resolvedChecked.includes(node.value),
        indeterminate: !checkStrictly && isIndeterminate(node.value, resolvedChecked, index),
        node
      })),
    getNodeLoadError: (value) => loadErrorState[value] ?? null,
    initialize: (data) => {
      const signature = treeDataSignature(data);
      if (signature === initializedSignature) return;
      setInitializedSignature(signature);
      setIndex(createTreeIndex(data));
    },
    invalidateNode: (value) => {
      setLoadedState((current) => {
        const next = { ...current };
        delete next[value];
        return next;
      });
    },
    isNodeChecked: (value) => resolvedChecked.includes(value),
    isNodeIndeterminate: (value) =>
      !checkStrictly && isIndeterminate(value, resolvedChecked, index),
    isNodeLoading: (value) => Boolean(loadingState[value]),
    loadNode,
    multiple,
    select: (value) => {
      setAnchorNode(value);
      setSelected(multiple ? (current) => uniqueValues([...current, value]) : [value]);
    },
    selectedState: resolvedSelected,
    setCheckedState: setChecked,
    setExpandedState: setExpanded,
    setSelectedState: setSelected,
    toggleExpanded: (value) => {
      if (resolvedExpanded[value]) {
        setExpanded((current) => ({ ...current, [value]: false }));
        onNodeCollapse?.(value);
      } else {
        setExpanded((current) => ({ ...current, [value]: true }));
        onNodeExpand?.(value);
        void loadNode(value);
      }
    },
    toggleSelected: (value) => {
      setAnchorNode(value);
      setSelected((current) =>
        current.includes(value)
          ? current.filter((item) => item !== value)
          : multiple
            ? [...current, value]
            : [value]
      );
    },
    uncheckAllNodes: () => setChecked([]),
    uncheckNode: (value) => {
      const remove = new Set(checkedWithDescendants(value));
      setChecked((current) => current.filter((item) => !remove.has(item)));
    }
  };
}

export function Tree({
  className,
  data,
  defaultExpandedValues,
  expandOnClick = true,
  levelOffset = 20,
  onNodeSelect,
  renderNode,
  selectOnClick = true,
  selectedValue,
  tree: controlledTree,
  withDragHandle,
  withLines
}: {
  className?: string;
  data: TreeNodeData[];
  defaultExpandedValues?: string[];
  expandOnClick?: boolean;
  levelOffset?: number;
  onNodeSelect?: (value: string, node: TreeNodeData) => void;
  renderNode?: (payload: RenderTreeNodePayload) => ReactNode;
  selectOnClick?: boolean;
  selectedValue?: string;
  tree?: TreeController;
  withDragHandle?: boolean;
  withLines?: boolean;
}) {
  const defaultExpandedState = useMemo(
    () => getTreeExpandedState(data, defaultExpandedValues ?? []),
    [data, defaultExpandedValues]
  );
  const internalTree = useTree({ initialExpandedState: defaultExpandedState });
  const tree = controlledTree ?? internalTree;

  useEffect(() => {
    tree.initialize(data);
  }, [data]);

  return (
    <div className={cn("text-sm", className)} role="tree">
      {data.map((node) => (
        <TreeNode
          key={node.value}
          expandOnClick={expandOnClick}
          level={0}
          levelOffset={levelOffset}
          node={node}
          onNodeSelect={onNodeSelect}
          renderNode={renderNode}
          selectOnClick={selectOnClick}
          selectedValue={selectedValue}
          tree={tree}
          withDragHandle={withDragHandle}
          withLines={withLines}
        />
      ))}
    </div>
  );
}

export function getTreeExpandedState(data: TreeNodeData[], expandedValues: string[] | "*") {
  const expanded = new Set(expandedValues === "*" ? collectExpandableValues(data) : expandedValues);
  return Object.fromEntries(Array.from(expanded).map((value) => [value, true]));
}

export function filterTreeData(
  data: TreeNodeData[],
  query: string,
  filter?: (query: string, node: TreeNodeData) => boolean
): TreeNodeData[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return data;
  const matches =
    filter ??
    ((value, node) =>
      `${node.label}`.toLowerCase().includes(value) || node.value.toLowerCase().includes(value));
  return data.flatMap((node) => {
    const children = node.children ? filterTreeData(node.children, normalized, matches) : [];
    if (matches(normalized, node) || children.length) {
      return [{ ...node, ...(children.length ? { children } : {}) }];
    }
    return [];
  });
}

export function mergeAsyncChildren(
  data: TreeNodeData[],
  nodeValue: string,
  children: TreeNodeData[]
): TreeNodeData[] {
  return data.map((node) => {
    if (node.value === nodeValue) return { ...node, children, hasChildren: true };
    if (node.children)
      return { ...node, children: mergeAsyncChildren(node.children, nodeValue, children) };
    return node;
  });
}

function TreeNode({
  expandOnClick,
  level,
  levelOffset,
  node,
  onNodeSelect,
  renderNode,
  selectOnClick,
  selectedValue,
  tree,
  withDragHandle,
  withLines
}: {
  expandOnClick: boolean;
  level: number;
  levelOffset: number;
  node: TreeNodeData;
  onNodeSelect: ((value: string, node: TreeNodeData) => void) | undefined;
  renderNode: ((payload: RenderTreeNodePayload) => ReactNode) | undefined;
  selectOnClick: boolean;
  selectedValue: string | undefined;
  tree: TreeController;
  withDragHandle: boolean | undefined;
  withLines: boolean | undefined;
}) {
  const hasChildren = Boolean(node.hasChildren || node.children?.length);
  const expanded = Boolean(tree.expandedState[node.value]);
  const selected =
    selectedValue !== undefined
      ? selectedValue === node.value
      : tree.selectedState.includes(node.value);
  const style = { paddingLeft: level * levelOffset } as CSSProperties;
  const elementProps = {
    className: cn(
      "flex h-8 w-full cursor-pointer select-none items-center gap-1.5 rounded-md px-2 text-left outline-none transition-colors hover:bg-muted/70",
      selected && "bg-foreground text-background hover:bg-foreground"
    ),
    "data-selected": selected || undefined,
    "data-value": node.value,
    onClick: (event: React.MouseEvent) => {
      if (hasChildren && expandOnClick) tree.toggleExpanded(node.value);
      if (selectOnClick) tree.select(node.value);
      onNodeSelect?.(node.value, node);
      event.stopPropagation();
    },
    style
  };
  const payload: RenderTreeNodePayload = {
    dragHandleProps: withDragHandle
      ? { onMouseDown: (event) => event.stopPropagation() }
      : undefined,
    elementProps,
    expanded,
    hasChildren,
    isLoading: tree.isNodeLoading(node.value),
    isRoot: level === 0,
    level,
    loadError: tree.getNodeLoadError(node.value),
    node,
    selected,
    tree
  };

  return (
    <div
      className="relative"
      role="treeitem"
      aria-expanded={hasChildren ? expanded : undefined}
      aria-selected={selected}
    >
      {withLines && level > 0 ? (
        <>
          <span
            aria-hidden="true"
            className="absolute top-0 h-full border-l border-border"
            style={{ left: level * levelOffset - levelOffset / 2 }}
          />
          <span
            aria-hidden="true"
            className="absolute border-t border-border"
            style={{ left: level * levelOffset - levelOffset / 2, top: 16, width: levelOffset / 2 }}
          />
        </>
      ) : null}
      {renderNode ? renderNode(payload) : <DefaultTreeNode {...payload} />}
      {hasChildren && expanded && node.children?.length ? (
        <div role="group">
          {node.children.map((child) => (
            <TreeNode
              key={child.value}
              expandOnClick={expandOnClick}
              level={level + 1}
              levelOffset={levelOffset}
              node={child}
              onNodeSelect={onNodeSelect}
              renderNode={renderNode}
              selectOnClick={selectOnClick}
              selectedValue={selectedValue}
              tree={tree}
              withDragHandle={withDragHandle}
              withLines={withLines}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function DefaultTreeNode({
  elementProps,
  expanded,
  hasChildren,
  isLoading,
  node,
  tree
}: RenderTreeNodePayload) {
  return (
    <button type="button" {...elementProps}>
      {hasChildren ? (
        <ChevronRight
          className={cn(
            "size-3.5 shrink-0 transition-transform",
            expanded && "rotate-90",
            isLoading && "animate-spin"
          )}
          onClick={(event) => {
            event.stopPropagation();
            tree.toggleExpanded(node.value);
          }}
        />
      ) : (
        <span className="size-3.5 shrink-0" />
      )}
      <span className="min-w-0 truncate">{node.label}</span>
    </button>
  );
}

function createTreeIndex(data: TreeNodeData[]) {
  const nodes = new Map<string, TreeNodeData>();
  const parent = new Map<string, string | null>();
  const descendants = new Map<string, string[]>();
  const values: string[] = [];

  function walk(items: TreeNodeData[], parentValue: string | null) {
    for (const node of items) {
      nodes.set(node.value, node);
      parent.set(node.value, parentValue);
      values.push(node.value);
      if (node.children?.length) {
        walk(node.children, node.value);
      }
    }
  }

  function collect(value: string): string[] {
    const node = nodes.get(value);
    if (!node?.children?.length) return [];
    const childValues = node.children.flatMap((child) => [child.value, ...collect(child.value)]);
    descendants.set(value, childValues);
    return childValues;
  }

  walk(data, null);
  for (const value of values) collect(value);
  return { descendants, nodes, parent, values };
}

function collectExpandableValues(data: TreeNodeData[]) {
  const values: string[] = [];
  function walk(nodes: TreeNodeData[]) {
    for (const node of nodes) {
      if (node.hasChildren || node.children?.length) values.push(node.value);
      if (node.children?.length) walk(node.children);
    }
  }
  walk(data);
  return values;
}

function isIndeterminate(value: string, checked: string[], index: TreeIndex) {
  const descendants = index.descendants.get(value) ?? [];
  if (!descendants.length) return false;
  const checkedCount = descendants.filter((item) => checked.includes(item)).length;
  return checkedCount > 0 && checkedCount < descendants.length;
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values));
}

function treeDataSignature(data: TreeNodeData[]) {
  const values: string[] = [];
  function walk(nodes: TreeNodeData[]) {
    for (const node of nodes) {
      values.push(node.value);
      if (node.children?.length) walk(node.children);
    }
  }
  walk(data);
  return values.join("\n");
}
