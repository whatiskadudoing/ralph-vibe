// deno-lint-ignore-file no-explicit-any
import ReactReconciler from "react-reconciler";
import {
  createNode,
  createTextNode,
  appendChildNode,
  insertBeforeNode,
  removeChildNode,
  setAttribute,
  setStyle,
  type DOMElement,
  type DOMNode,
  type NodeType,
} from "./dom.ts";

export interface HostConfig {
  onRender: () => void;
}

type Container = DOMElement;
type Instance = DOMElement;
type TextInstance = ReturnType<typeof createTextNode>;
type Props = Record<string, any>;

const NO_CONTEXT = {};

export function createReconciler(hostConfig: HostConfig) {
  const reconciler = ReactReconciler<
    NodeType,
    Props,
    Container,
    Instance,
    TextInstance,
    any,
    any,
    any,
    typeof NO_CONTEXT,
    any,
    any,
    any,
    any
  >({
    // Host config
    supportsMutation: true,
    supportsPersistence: false,
    supportsHydration: false,
    isPrimaryRenderer: true,

    // Create instances
    createInstance(type: NodeType, props: Props): Instance {
      const node = createNode(type);

      // Apply props
      for (const [key, value] of Object.entries(props)) {
        if (key === "children") continue;
        if (key === "style") {
          setStyle(node, value);
        } else if (key === "internal_static") {
          node.internal_static = true;
        } else {
          setAttribute(node, key, value);
        }
      }

      return node;
    },

    createTextInstance(text: string): TextInstance {
      return createTextNode(text);
    },

    // Tree operations
    appendInitialChild(parentInstance: Instance, child: DOMNode): void {
      appendChildNode(parentInstance, child);
    },

    appendChild(parentInstance: Instance, child: DOMNode): void {
      appendChildNode(parentInstance, child);
    },

    appendChildToContainer(container: Container, child: DOMNode): void {
      appendChildNode(container, child);
    },

    insertBefore(
      parentInstance: Instance,
      child: DOMNode,
      beforeChild: DOMNode
    ): void {
      insertBeforeNode(parentInstance, child, beforeChild);
    },

    insertInContainerBefore(
      container: Container,
      child: DOMNode,
      beforeChild: DOMNode
    ): void {
      insertBeforeNode(container, child, beforeChild);
    },

    removeChild(parentInstance: Instance, child: DOMNode): void {
      removeChildNode(parentInstance, child);
    },

    removeChildFromContainer(container: Container, child: DOMNode): void {
      removeChildNode(container, child);
    },

    // Updates
    prepareUpdate(
      _instance: Instance,
      _type: NodeType,
      oldProps: Props,
      newProps: Props
    ): Props | null {
      const updatePayload: Props = {};
      let hasUpdate = false;

      for (const key of Object.keys(newProps)) {
        if (key === "children") continue;
        if (oldProps[key] !== newProps[key]) {
          updatePayload[key] = newProps[key];
          hasUpdate = true;
        }
      }

      for (const key of Object.keys(oldProps)) {
        if (key === "children") continue;
        if (!(key in newProps)) {
          updatePayload[key] = undefined;
          hasUpdate = true;
        }
      }

      return hasUpdate ? updatePayload : null;
    },

    commitUpdate(
      instance: Instance,
      updatePayload: Props,
      _type: NodeType,
      _oldProps: Props,
      _newProps: Props
    ): void {
      for (const [key, value] of Object.entries(updatePayload)) {
        if (key === "style") {
          setStyle(instance, value);
        } else {
          setAttribute(instance, key, value);
        }
      }

      hostConfig.onRender();
    },

    commitTextUpdate(
      textInstance: TextInstance,
      _oldText: string,
      newText: string
    ): void {
      textInstance.nodeValue = newText;
      hostConfig.onRender();
    },

    // Finalization
    finalizeInitialChildren(): boolean {
      return false;
    },

    prepareForCommit(): null {
      return null;
    },

    resetAfterCommit(): void {
      hostConfig.onRender();
    },

    // Context
    getRootHostContext(): typeof NO_CONTEXT {
      return NO_CONTEXT;
    },

    getChildHostContext(): typeof NO_CONTEXT {
      return NO_CONTEXT;
    },

    // Text content
    shouldSetTextContent(): boolean {
      return false;
    },

    // Portal support (not needed)
    getPublicInstance(instance: Instance | TextInstance): Instance | TextInstance {
      return instance;
    },

    preparePortalMount(): void {},

    // Scheduling
    scheduleTimeout: setTimeout,
    cancelTimeout: clearTimeout,
    noTimeout: -1,

    // Misc
    getCurrentEventPriority: () => 16, // DefaultEventPriority
    getInstanceFromNode: () => null,
    beforeActiveInstanceBlur: () => {},
    afterActiveInstanceBlur: () => {},
    prepareScopeUpdate: () => {},
    getInstanceFromScope: () => null,
    detachDeletedInstance: () => {},

    // Required methods
    clearContainer(container: Container): void {
      container.childNodes = [];
    },

    // Microtasks
    supportsMicrotasks: true,
    scheduleMicrotask:
      typeof queueMicrotask === "function"
        ? queueMicrotask
        : (fn: () => void) => Promise.resolve().then(fn),

    // Not used but required
    hideInstance: () => {},
    hideTextInstance: () => {},
    unhideInstance: () => {},
    unhideTextInstance: () => {},

    // Required new methods
    setCurrentUpdatePriority: () => {},
    getCurrentUpdatePriority: () => 16,
    resolveUpdatePriority: () => 16,
    resetFormInstance: () => {},
    requestPostPaintCallback: () => {},
    maySuspendCommit: () => false,
    preloadInstance: () => true,
    startSuspendingCommit: () => {},
    suspendInstance: () => {},
    waitForCommitToBeReady: () => null,
    NotPendingTransition: null,
  });

  return reconciler;
}
