// dsh-live-canvas: generator_tools.js
import { buildWireframeTemplate } from '../wireframe.js';
import { buildPlanTemplate } from '../plan.js';
import { buildDiagramTemplate } from '../diagram.js';
import { buildPrototypeTemplate } from '../prototype.js';
import { buildCrudTemplate } from '../crud.js';
import { defineTool } from './shared.js';

export function registerGeneratorTools(toolCtx) {
  const { ctx, store, eventHub, options, getWorkspaceRoots, getWorkspaceDir, defineTool } = toolCtx;

  // Tool 21: live_canvas_create_wireframe
  ctx.tools.register(defineTool({
    name: 'live_canvas_create_wireframe',
    description: 'Generates a low-fidelity structural HTML wireframe artifact (blueprint mode) to evaluate information architecture, hierarchy, and UX without styling bias.',
    parameters: {
      title: { type: 'string', description: 'Wireframe title (e.g. "E-Commerce Checkout Flow")' },
      layout: { type: 'string', enum: ['landing', 'dashboard', 'ecommerce', 'settings'], description: 'Wireframe layout archetype (default: landing)' },
      canvasId: { type: 'string', description: 'Optional canvas session ID' }
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          success: { type: 'boolean' },
          canvasId: { type: 'string' },
          previewUrl: { type: 'string' },
          layout: { type: 'string' },
          message: { type: 'string' },
          error: { type: 'string' }
        }
      },
      render(_args, val) {
        return [{ type: 'text', text: val.message || val.error || 'Wireframe created' }];
      }
    },
    execute: async (args = {}) => {
      const html = buildWireframeTemplate({
        title: args.title || 'Structural Wireframe',
        layout: args.layout || 'landing'
      });
      const session = store.createOrUpdateSession({
        id: args.canvasId,
        title: args.title || 'UI Wireframe',
        content: html,
        componentType: 'html'
      });
      eventHub.broadcast('update', { canvasId: session.id });
      const previewUrl = '/dsh-live-canvas/sandbox/' + session.id;
      return {
        success: true,
        canvasId: session.id,
        previewUrl,
        layout: args.layout || 'landing',
        message: 'Wireframe artifact created at ' + previewUrl
      };
    }
  }));


  // Tool 22: live_canvas_create_plan
  ctx.tools.register(defineTool({
    name: 'live_canvas_create_plan',
    description: 'Generates an interactive HTML project plan & release readiness roadmap artifact with milestone checkboxes and persistent local state.',
    parameters: {
      title: { type: 'string', description: 'Plan roadmap title (e.g. "Release Readiness v1.0.0")' },
      version: { type: 'string', description: 'Target version tag (default: v1.0.0)' },
      canvasId: { type: 'string', description: 'Optional canvas session ID' }
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          success: { type: 'boolean' },
          canvasId: { type: 'string' },
          previewUrl: { type: 'string' },
          version: { type: 'string' },
          message: { type: 'string' },
          error: { type: 'string' }
        }
      },
      render(_args, val) {
        return [{ type: 'text', text: val.message || val.error || 'Plan artifact created' }];
      }
    },
    execute: async (args = {}) => {
      const ver = args.version || 'v1.0.0';
      const html = buildPlanTemplate({
        title: args.title || 'Release Readiness Roadmap',
        version: ver
      });
      const session = store.createOrUpdateSession({
        id: args.canvasId,
        title: args.title || 'Interactive Project Plan',
        content: html,
        componentType: 'html'
      });
      eventHub.broadcast('update', { canvasId: session.id });
      const previewUrl = '/dsh-live-canvas/sandbox/' + session.id;
      return {
        success: true,
        canvasId: session.id,
        previewUrl,
        version: ver,
        message: 'Interactive Plan artifact created at ' + previewUrl
      };
    }
  }));


  // Tool 23: live_canvas_create_diagram
  ctx.tools.register(defineTool({
    name: 'live_canvas_create_diagram',
    description: 'Generates a living interactive architecture & data flow diagram artifact with clickable node inspection and animated data streams.',
    parameters: {
      title: { type: 'string', description: 'Diagram title (e.g. "Microservices Ingress & Gateway Flow")' },
      diagramType: { type: 'string', enum: ['architecture', 'sequence', 'dataflow'], description: 'Type of diagram (default: architecture)' },
      canvasId: { type: 'string', description: 'Optional canvas session ID' }
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          success: { type: 'boolean' },
          canvasId: { type: 'string' },
          previewUrl: { type: 'string' },
          diagramType: { type: 'string' },
          message: { type: 'string' },
          error: { type: 'string' }
        }
      },
      render(_args, val) {
        return [{ type: 'text', text: val.message || val.error || 'Diagram artifact created' }];
      }
    },
    execute: async (args = {}) => {
      const type = args.diagramType || 'architecture';
      const html = buildDiagramTemplate({
        title: args.title || 'System Architecture Diagram'
      });
      const session = store.createOrUpdateSession({
        id: args.canvasId,
        title: args.title || 'Interactive System Diagram',
        content: html,
        componentType: 'html'
      });
      eventHub.broadcast('update', { canvasId: session.id });
      const previewUrl = '/dsh-live-canvas/sandbox/' + session.id;
      return {
        success: true,
        canvasId: session.id,
        previewUrl,
        diagramType: type,
        message: 'Interactive Architecture Diagram created at ' + previewUrl
      };
    }
  }));


  // Tool 24: live_canvas_create_prototype
  ctx.tools.register(defineTool({
    name: 'live_canvas_create_prototype',
    description: 'Generates a multi-step interactive prototype flow artifact (wizards, auth onboarding, multi-step checkout) with animated step transitions.',
    parameters: {
      title: { type: 'string', description: 'Prototype flow title' },
      flowType: { type: 'string', enum: ['wizard', 'auth', 'checkout', 'onboarding'], description: 'Flow archetype (default: wizard)' },
      canvasId: { type: 'string', description: 'Optional canvas session ID' }
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          success: { type: 'boolean' },
          canvasId: { type: 'string' },
          previewUrl: { type: 'string' },
          flowType: { type: 'string' },
          message: { type: 'string' },
          error: { type: 'string' }
        }
      },
      render(_args, val) {
        return [{ type: 'text', text: val.message || val.error || 'Prototype created' }];
      }
    },
    execute: async (args = {}) => {
      const flow = args.flowType || 'wizard';
      const html = buildPrototypeTemplate({
        title: args.title || 'Interactive Prototype Flow'
      });
      const session = store.createOrUpdateSession({
        id: args.canvasId,
        title: args.title || 'Interactive Prototype',
        content: html,
        componentType: 'html'
      });
      eventHub.broadcast('update', { canvasId: session.id });
      const previewUrl = '/dsh-live-canvas/sandbox/' + session.id;
      return {
        success: true,
        canvasId: session.id,
        previewUrl,
        flowType: flow,
        message: 'Interactive Prototype Flow created at ' + previewUrl
      };
    }
  }));


  // Tool 25: live_canvas_resolve_annotation
  ctx.tools.register(defineTool({
    name: 'live_canvas_resolve_annotation',
    description: 'Marks a visual user annotation as resolved with optional resolution notes and sign-off.',
    parameters: {
      canvasId: { type: 'string', description: 'Canvas session ID' },
      annotationId: { type: 'string', description: 'Annotation ID (e.g. "ann-1234abcd")' },
      note: { type: 'string', description: 'Resolution comment explaining how the issue was fixed' }
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          success: { type: 'boolean' },
          canvasId: { type: 'string' },
          annotationId: { type: 'string' },
          status: { type: 'string' },
          message: { type: 'string' },
          error: { type: 'string' }
        }
      },
      render(_args, val) {
        return [{ type: 'text', text: val.message || val.error || 'Annotation resolved' }];
      }
    },
    execute: async (args = {}) => {
      if (!args.canvasId || !args.annotationId) {
        return { success: false, error: 'canvasId and annotationId are required' };
      }
      const item = store.resolveAnnotation(args.canvasId, args.annotationId, args.note);
      if (!item) {
        return { success: false, error: 'Annotation ' + args.annotationId + ' not found on canvas ' + args.canvasId };
      }
      eventHub.broadcast('update', { canvasId: args.canvasId });
      return {
        success: true,
        canvasId: args.canvasId,
        annotationId: args.annotationId,
        status: 'resolved',
        message: 'Annotation ' + args.annotationId + ' marked as resolved.'
      };
    }
  }));



  // Tool 26: live_canvas_create_crud
  ctx.tools.register(defineTool({
    name: 'live_canvas_create_crud',
    description: 'Generate Retool-style CRUD admin dashboard with search, filters, edit modal, and CSV export.',
    parameters: {
      title: { type: 'string', description: 'Admin dashboard title (e.g. "Customer Subscriptions Management")' },
      entityName: { type: 'string', description: 'Entity singular name (e.g. "Customer", "Product", "Invoice")' },
      canvasId: { type: 'string', description: 'Optional canvas session ID' }
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          success: { type: 'boolean' },
          canvasId: { type: 'string' },
          previewUrl: { type: 'string' },
          entityName: { type: 'string' },
          message: { type: 'string' },
          error: { type: 'string' }
        }
      },
      render(_args, val) {
        return [{ type: 'text', text: val.message || val.error || 'CRUD Dashboard created' }];
      }
    },
    execute: async (args = {}) => {
      const entity = args.entityName || 'Customer';
      const html = buildCrudTemplate({
        title: args.title || (entity + ' Management Dashboard'),
        entityName: entity
      });
      const session = store.createOrUpdateSession({
        id: args.canvasId,
        title: args.title || (entity + ' Admin CRUD'),
        content: html,
        componentType: 'html'
      });
      eventHub.broadcast('update', { canvasId: session.id });
      const previewUrl = '/dsh-live-canvas/sandbox/' + session.id;
      return {
        success: true,
        canvasId: session.id,
        previewUrl,
        entityName: entity,
        message: 'CRUD Admin Dashboard created at ' + previewUrl
      };
    }
  }));


}
