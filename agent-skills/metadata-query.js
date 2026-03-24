const View = require("@saltcorn/data/models/view");
const Page = require("@saltcorn/data/models/page");
const Trigger = require("@saltcorn/data/models/trigger");
const User = require("@saltcorn/data/models/user");
const { getState } = require("@saltcorn/data/db/state");
const { table, tbody, tr, th, td, div, h5, pre, code } = require("@saltcorn/markup/tags");

const renderTable = (rows, columns) => {
  if (!rows || !rows.length) return div({ class: "text-muted" }, "No results");
  return table(
    { class: "table table-sm table-striped" },
    tbody(
      ...rows.map((row) =>
        tr(
          ...columns.map((col) =>
            typeof col === "string"
              ? td(row[col] ?? "")
              : td(col(row))
          )
        )
      )
    )
  );
};

const roleName = (minRole) => {
  const state = getState();
  const role = state.roles?.find((r) => r.id === minRole);
  return role?.role || minRole?.toString() || "Public";
};

class MetadataQuerySkill {
  static skill_name = "Metadata Query";

  get skill_label() {
    return "Query Application Metadata";
  }

  constructor(cfg) {
    Object.assign(this, cfg);
  }

  async systemPrompt() {
    return `You have tools to query the Saltcorn application structure. Use these tools to understand what already exists in the application before suggesting new components or modifications. Available tools:
- list_views: List all views with their type and associated table
- get_view_config: Get detailed configuration of a specific view
- list_pages: List all pages
- get_page_layout: Get layout structure of a specific page
- list_triggers: List all triggers and workflows
- get_trigger_config: Get configuration of a specific trigger
- list_action_types: List all available action types in the system that can be used in workflows and triggers
- list_roles: List all roles defined in the system`;
  }

  static async configFields() {
    return [];
  }

  get userActions() {
    return {};
  }

  provideTools = () => {
    return [
      {
        type: "function",
        function: {
          name: "list_views",
          description:
            "List all views in the application with their viewtemplate type, associated table, and minimum role",
          parameters: {
            type: "object",
            properties: {},
          },
        },
        process: async () => {
          const state = getState();
          const views = state.views || [];
          const result = views.map((v) => ({
            name: v.name,
            viewtemplate: v.viewtemplate,
            table_id: v.table_id,
            table_name: v.table?.name || null,
            min_role: v.min_role,
          }));
          return JSON.stringify(result, null, 2);
        },
        renderToolResponse: async (result) => {
          let views;
          try {
            views = typeof result === "string" ? JSON.parse(result) : result;
          } catch {
            return div({ class: "alert alert-warning" }, result);
          }
          return div(
            h5("Views"),
            renderTable(views, [
              (v) => td(code(v.name)),
              "viewtemplate",
              (v) => td(v.table_name || "-"),
              (v) => td(roleName(v.min_role)),
            ])
          );
        },
      },
      {
        type: "function",
        function: {
          name: "get_view_config",
          description:
            "Get the detailed configuration of a specific view by name",
          parameters: {
            type: "object",
            required: ["view_name"],
            properties: {
              view_name: {
                type: "string",
                description: "The name of the view to query",
              },
            },
          },
        },
        process: async (input) => {
          const viewName =
            typeof input === "string" ? input : input?.view_name;
          if (!viewName) return "Error: view_name parameter required";
          const state = getState();
          const view = state.views?.find((v) => v.name === viewName);
          if (!view) return `View "${viewName}" not found`;
          const result = {
            name: view.name,
            viewtemplate: view.viewtemplate,
            table_id: view.table_id,
            table_name: view.table?.name || null,
            min_role: view.min_role,
            configuration: view.configuration || {},
          };
          return JSON.stringify(result, null, 2);
        },
        renderToolResponse: async (result) => {
          let view;
          try {
            view = typeof result === "string" ? JSON.parse(result) : result;
          } catch {
            return div({ class: "alert alert-warning" }, result);
          }
          return div(
            h5("View: " + view.name),
            renderTable(
              [
                { prop: "Name", val: view.name },
                { prop: "Template", val: view.viewtemplate },
                { prop: "Table", val: view.table_name || "None" },
                { prop: "Min Role", val: roleName(view.min_role) },
              ],
              ["prop", "val"]
            )
          );
        },
      },
      {
        type: "function",
        function: {
          name: "list_pages",
          description:
            "List all pages in the application with their title, description and minimum role",
          parameters: {
            type: "object",
            properties: {},
          },
        },
        process: async () => {
          const state = getState();
          const pages = state.pages || [];
          const result = pages.map((p) => ({
            name: p.name,
            title: p.title,
            description: p.description,
            min_role: p.min_role,
          }));
          return JSON.stringify(result, null, 2);
        },
        renderToolResponse: async (result) => {
          let pages;
          try {
            pages = typeof result === "string" ? JSON.parse(result) : result;
          } catch {
            return div({ class: "alert alert-warning" }, result);
          }
          return div(
            h5("Pages"),
            renderTable(pages, [
              (p) => td(code(p.name)),
              "title",
              (p) => td(roleName(p.min_role)),
            ])
          );
        },
      },
      {
        type: "function",
        function: {
          name: "get_page_layout",
          description:
            "Get the layout structure of a specific page by name",
          parameters: {
            type: "object",
            required: ["page_name"],
            properties: {
              page_name: {
                type: "string",
                description: "The name of the page to query",
              },
            },
          },
        },
        process: async (input) => {
          const pageName =
            typeof input === "string" ? input : input?.page_name;
          if (!pageName) return "Error: page_name parameter required";
          const state = getState();
          const page = state.pages?.find((p) => p.name === pageName);
          if (!page) return `Page "${pageName}" not found`;
          const result = {
            name: page.name,
            title: page.title,
            description: page.description,
            min_role: page.min_role,
            layout: page.layout || {},
            fixed_states: page.fixed_states || {},
          };
          return JSON.stringify(result, null, 2);
        },
        renderToolResponse: async (result) => {
          let page;
          try {
            page = typeof result === "string" ? JSON.parse(result) : result;
          } catch {
            return div({ class: "alert alert-warning" }, result);
          }
          return div(
            h5("Page: " + page.name),
            renderTable(
              [
                { prop: "Name", val: page.name },
                { prop: "Title", val: page.title || "-" },
                { prop: "Description", val: page.description || "-" },
                { prop: "Min Role", val: roleName(page.min_role) },
              ],
              ["prop", "val"]
            )
          );
        },
      },
      {
        type: "function",
        function: {
          name: "list_triggers",
          description:
            "List all triggers and workflows in the application with their trigger type and associated table",
          parameters: {
            type: "object",
            properties: {},
          },
        },
        process: async () => {
          const state = getState();
          const triggers = state.triggers || [];
          const result = triggers.map((t) => ({
            name: t.name,
            when_trigger: t.when_trigger,
            table_id: t.table_id,
            table_name: t.table?.name || null,
            action: t.action,
          }));
          return JSON.stringify(result, null, 2);
        },
        renderToolResponse: async (result) => {
          let triggers;
          try {
            triggers = typeof result === "string" ? JSON.parse(result) : result;
          } catch {
            return div({ class: "alert alert-warning" }, result);
          }
          return div(
            h5("Triggers"),
            renderTable(triggers, [
              (t) => td(code(t.name)),
              "when_trigger",
              (t) => td(t.table_name || "-"),
              "action",
            ])
          );
        },
      },
      {
        type: "function",
        function: {
          name: "get_trigger_config",
          description:
            "Get the configuration of a specific trigger by name",
          parameters: {
            type: "object",
            required: ["trigger_name"],
            properties: {
              trigger_name: {
                type: "string",
                description: "The name of the trigger to query",
              },
            },
          },
        },
        process: async (input) => {
          const triggerName =
            typeof input === "string" ? input : input?.trigger_name;
          if (!triggerName) return "Error: trigger_name parameter required";
          const state = getState();
          const trigger = state.triggers?.find((t) => t.name === triggerName);
          if (!trigger) return `Trigger "${triggerName}" not found`;
          const result = {
            name: trigger.name,
            when_trigger: trigger.when_trigger,
            table_id: trigger.table_id,
            table_name: trigger.table?.name || null,
            action: trigger.action,
            configuration: trigger.configuration || {},
          };
          return JSON.stringify(result, null, 2);
        },
        renderToolResponse: async (result) => {
          let trigger;
          try {
            trigger = typeof result === "string" ? JSON.parse(result) : result;
          } catch {
            return div({ class: "alert alert-warning" }, result);
          }
          return div(
            h5("Trigger: " + trigger.name),
            renderTable(
              [
                { prop: "Name", val: trigger.name },
                { prop: "When", val: trigger.when_trigger },
                { prop: "Table", val: trigger.table_name || "None" },
                { prop: "Action", val: trigger.action },
              ],
              ["prop", "val"]
            )
          );
        },
      },
      {
        type: "function",
        function: {
          name: "list_action_types",
          description:
            "List all available action types in the system that can be used when creating triggers and workflows (e.g., Agent, Email, Webhook, etc.)",
          parameters: {
            type: "object",
            properties: {},
          },
        },
        process: async () => {
          const state = getState();
          const actions = state.actions || {};
          const result = Object.entries(actions).map(([name, action]) => ({
            name,
            description:
              typeof action.description === "function"
                ? action.description()
                : action.description || "",
          }));
          return JSON.stringify(result, null, 2);
        },
        renderToolResponse: async (result) => {
          let actions;
          try {
            actions = typeof result === "string" ? JSON.parse(result) : result;
          } catch {
            return div({ class: "alert alert-warning" }, result);
          }
          return div(
            h5("Available Action Types"),
            renderTable(actions, [
              (a) => td(code(a.name)),
              (a) => td(a.description?.substring(0, 100) || "-"),
            ])
          );
        },
      },
      {
        type: "function",
        function: {
          name: "list_roles",
          description: "List all roles defined in the system",
          parameters: {
            type: "object",
            properties: {},
          },
        },
        process: async () => {
          const state = getState();
          const roles = state.roles || [];
          const result = roles.map((r) => ({
            id: r.id,
            role: r.role,
            description: r.description || "",
          }));
          return JSON.stringify(result, null, 2);
        },
        renderToolResponse: async (result) => {
          let roles;
          try {
            roles = typeof result === "string" ? JSON.parse(result) : result;
          } catch {
            return div({ class: "alert alert-warning" }, result);
          }
          return div(
            h5("Roles"),
            renderTable(roles, [
              "id",
              (r) => td(code(r.role)),
              (r) => td(r.description || "-"),
            ])
          );
        },
      },
    ];
  };
}

module.exports = MetadataQuerySkill;
