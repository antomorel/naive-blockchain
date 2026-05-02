import js from "@eslint/js"
import tsPlugin from "@typescript-eslint/eslint-plugin"
import tsParser from "@typescript-eslint/parser"
import prettierConfig from "eslint-config-prettier"

/**
 * Custom ESLint rule to ban { disableValidation: true } in Schema.make() calls.
 * Disabling validation defeats the purpose of using Schema and can hide bugs.
 */
const noDisableValidationRule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow disableValidation: true in Schema operations"
    },
    messages: {
      noDisableValidation:
        "Do not use { disableValidation: true }. Schema validation should always be enabled to catch invalid data. If you're seeing validation errors, fix the data or schema instead of disabling validation."
    },
    schema: []
  },
  create(context) {
    return {
      Property(node) {
        if (
          node.key &&
          ((node.key.type === "Identifier" && node.key.name === "disableValidation") ||
            (node.key.type === "Literal" && node.key.value === "disableValidation")) &&
          node.value &&
          node.value.type === "Literal" &&
          node.value.value === true
        ) {
          context.report({
            node,
            messageId: "noDisableValidation"
          })
        }
      }
    }
  }
}

/**
 * Custom ESLint rule to suggest Option.fromNullable instead of ternary with Option.some/none.
 * x !== null ? Option.some(x) : Option.none() should be Option.fromNullable(x)
 */
const preferOptionFromNullableRule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Prefer Option.fromNullable over ternary with Option.some/none"
    },
    messages: {
      preferFromNullable:
        "Use Option.fromNullable({{name}}) instead of ternary with Option.some/Option.none."
    },
    schema: []
  },
  create(context) {
    return {
      ConditionalExpression(node) {
        const { test, consequent, alternate } = node

        // Check if test is: x !== null or x != null
        if (test.type !== "BinaryExpression") return
        if (test.operator !== "!==" && test.operator !== "!=") return

        let testedName = null
        if (
          test.left.type === "Identifier" &&
          test.right.type === "Literal" &&
          test.right.value === null
        ) {
          testedName = test.left.name
        } else if (
          test.right.type === "Identifier" &&
          test.left.type === "Literal" &&
          test.left.value === null
        ) {
          testedName = test.right.name
        } else if (
          test.left.type === "MemberExpression" &&
          test.right.type === "Literal" &&
          test.right.value === null
        ) {
          testedName = context.getSourceCode().getText(test.left)
        } else if (
          test.right.type === "MemberExpression" &&
          test.left.type === "Literal" &&
          test.left.value === null
        ) {
          testedName = context.getSourceCode().getText(test.right)
        }
        if (!testedName) return

        // Check if consequent is Option.some(x)
        if (consequent.type !== "CallExpression") return
        const conseqCallee = consequent.callee
        const isOptionSome =
          conseqCallee.type === "MemberExpression" &&
          conseqCallee.object.type === "Identifier" &&
          conseqCallee.object.name === "Option" &&
          conseqCallee.property.type === "Identifier" &&
          conseqCallee.property.name === "some"
        if (!isOptionSome) return

        // Check if alternate is Option.none()
        if (alternate.type !== "CallExpression") return
        const altCallee = alternate.callee
        // Handle both Option.none() and Option.none<Type>()
        const isOptionNone =
          (altCallee.type === "MemberExpression" &&
            altCallee.object.type === "Identifier" &&
            altCallee.object.name === "Option" &&
            altCallee.property.type === "Identifier" &&
            altCallee.property.name === "none") ||
          (altCallee.type === "TSInstantiationExpression" &&
            altCallee.expression.type === "MemberExpression" &&
            altCallee.expression.object.type === "Identifier" &&
            altCallee.expression.object.name === "Option" &&
            altCallee.expression.property.type === "Identifier" &&
            altCallee.expression.property.name === "none")
        if (!isOptionNone) return

        context.report({
          node,
          messageId: "preferFromNullable",
          data: { name: testedName }
        })
      }
    }
  }
}

/**
 * Custom ESLint rule to warn when .pipe() has too many arguments.
 * Long pipes are hard to read and should be split into multiple .pipe() calls.
 */
const pipeMaxArgumentsRule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow .pipe() with more than 20 arguments"
    },
    messages: {
      tooManyArgs:
        ".pipe() has {{count}} arguments. Consider splitting into multiple .pipe() calls for readability (max 20)."
    },
    schema: []
  },
  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee
        // Check for .pipe() method call
        if (
          callee.type === "MemberExpression" &&
          callee.property.type === "Identifier" &&
          callee.property.name === "pipe"
        ) {
          if (node.arguments.length > 20) {
            context.report({
              node,
              messageId: "tooManyArgs",
              data: { count: node.arguments.length }
            })
          }
        }
      }
    }
  }
}

/**
 * Custom ESLint rule to ban Effect.asVoid usage.
 * Effect.asVoid is usually unnecessary because `void` allows any value to be returned.
 */
const noEffectAsVoidRule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow Effect.asVoid - it is usually unnecessary"
    },
    messages: {
      noEffectAsVoid:
        "Effect.asVoid is usually unnecessary. The `void` return type already allows any value to be returned from an effect. Remove it."
    },
    schema: []
  },
  create(context) {
    return {
      MemberExpression(node) {
        if (
          node.object.type === "Identifier" &&
          node.object.name === "Effect" &&
          node.property.type === "Identifier" &&
          node.property.name === "asVoid"
        ) {
          context.report({
            node,
            messageId: "noEffectAsVoid"
          })
        }
      }
    }
  }
}

/**
 * Custom ESLint rule to ban Effect.ignore usage.
 * Effect.ignore silently discards errors which hides bugs.
 */
const noEffectIgnoreRule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow Effect.ignore - errors should be explicitly handled"
    },
    messages: {
      noEffectIgnore:
        "Do not use Effect.ignore. It silently discards errors which hides bugs. Handle errors explicitly with Effect.catchTag, Effect.catchAll, or propagate them."
    },
    schema: []
  },
  create(context) {
    return {
      MemberExpression(node) {
        if (
          node.object.type === "Identifier" &&
          node.object.name === "Effect" &&
          node.property.type === "Identifier" &&
          node.property.name === "ignore"
        ) {
          context.report({
            node,
            messageId: "noEffectIgnore"
          })
        }
      }
    }
  }
}

/**
 * Custom ESLint rule to ban Effect.catchAllCause usage.
 * catchAllCause catches defects (bugs) which should crash the program.
 */
const noEffectCatchAllCauseRule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow Effect.catchAllCause - it catches defects which should not be caught"
    },
    messages: {
      noEffectCatchAllCause:
        "Do not use Effect.catchAllCause. It catches defects (bugs) which should crash the program. Use Effect.catchAll or Effect.catchTag to handle expected errors only."
    },
    schema: []
  },
  create(context) {
    return {
      MemberExpression(node) {
        if (
          node.object.type === "Identifier" &&
          node.object.name === "Effect" &&
          node.property.type === "Identifier" &&
          node.property.name === "catchAllCause"
        ) {
          context.report({
            node,
            messageId: "noEffectCatchAllCause"
          })
        }
      }
    }
  }
}

/**
 * Custom ESLint rule to ban silently swallowing errors with catch handlers that return Effect.void.
 */
const noSilentErrorSwallowRule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow catch handlers that silently swallow errors by returning Effect.void"
    },
    messages: {
      noSilentSwallow:
        "Do not silently swallow errors with '() => Effect.void'. Errors should be represented in the type system, not ignored."
    },
    schema: []
  },
  create(context) {
    function isEffectVoidOrUnit(node) {
      if (!node) return false
      if (node.type === "MemberExpression") {
        return (
          node.object.type === "Identifier" &&
          node.object.name === "Effect" &&
          node.property.type === "Identifier" &&
          (node.property.name === "void" || node.property.name === "unit")
        )
      }
      return false
    }

    function isVoidReturningHandler(node) {
      if (!node) return false

      if (node.type === "ArrowFunctionExpression") {
        if (isEffectVoidOrUnit(node.body)) {
          return true
        }
        if (node.body.type === "BlockStatement") {
          const body = node.body.body
          if (body.length === 1 && body[0].type === "ReturnStatement") {
            return isEffectVoidOrUnit(body[0].argument)
          }
        }
      }

      if (node.type === "FunctionExpression") {
        const body = node.body.body
        if (body.length === 1 && body[0].type === "ReturnStatement") {
          return isEffectVoidOrUnit(body[0].argument)
        }
      }

      return false
    }

    function isCatchCall(node) {
      if (node.type !== "CallExpression") return false
      const callee = node.callee

      if (callee.type === "MemberExpression") {
        const propName = callee.property.type === "Identifier" ? callee.property.name : null
        if (propName === "catchTag" || propName === "catchAll" || propName === "catchTags") {
          if (callee.object.type === "Identifier" && callee.object.name === "Effect") {
            return propName
          }
        }
      }

      return null
    }

    return {
      CallExpression(node) {
        const catchType = isCatchCall(node)
        if (!catchType) return

        let handlerArg = null

        if (catchType === "catchTag" && node.arguments.length >= 2) {
          handlerArg = node.arguments[1]
        } else if (catchType === "catchAll" && node.arguments.length >= 1) {
          handlerArg = node.arguments[0]
        } else if (catchType === "catchTags" && node.arguments.length >= 1) {
          const obj = node.arguments[0]
          if (obj.type === "ObjectExpression") {
            for (const prop of obj.properties) {
              if (prop.type === "Property" && isVoidReturningHandler(prop.value)) {
                context.report({
                  node: prop.value,
                  messageId: "noSilentSwallow"
                })
              }
            }
          }
          return
        }

        if (handlerArg && isVoidReturningHandler(handlerArg)) {
          context.report({
            node: handlerArg,
            messageId: "noSilentSwallow"
          })
        }
      }
    }
  }
}

/**
 * Custom ESLint rule to ban void expressions (e.g., void someValue).
 */
const noVoidExpressionRule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow void expressions - they are no-ops"
    },
    messages: {
      noVoidExpression:
        "'void {{expression}}' is a no-op. It evaluates the expression and discards the result. Remove it or use the value."
    },
    schema: []
  },
  create(context) {
    return {
      UnaryExpression(node) {
        if (node.operator === "void") {
          const expression = context.getSourceCode().getText(node.argument)
          context.report({
            node,
            messageId: "noVoidExpression",
            data: { expression }
          })
        }
      }
    }
  }
}

/**
 * Custom ESLint rule to ban Effect.serviceOption usage.
 */
const noServiceOptionRule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow Effect.serviceOption - services should always be present in context"
    },
    messages: {
      noServiceOption:
        "Do not use Effect.serviceOption. Services should always be present in context, even during testing."
    },
    schema: []
  },
  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee
        if (
          callee.type === "MemberExpression" &&
          callee.object.type === "Identifier" &&
          callee.object.name === "Effect" &&
          callee.property.type === "Identifier" &&
          callee.property.name === "serviceOption"
        ) {
          context.report({
            node,
            messageId: "noServiceOption"
          })
        }
      }
    }
  }
}

/**
 * Custom ESLint rule to warn when Layer.provide is nested inside another Layer.provide.
 */
const noNestedLayerProvideRule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow nested Layer.provide calls"
    },
    messages: {
      nestedProvide:
        "Nested Layer.provide detected. Extract the inner Layer.provide to a separate variable or use Layer.provideMerge."
    },
    schema: []
  },
  create(context) {
    function isLayerProvide(node) {
      if (node.type !== "CallExpression") return false
      const callee = node.callee
      return (
        callee.type === "MemberExpression" &&
        callee.object.type === "Identifier" &&
        callee.object.name === "Layer" &&
        callee.property.type === "Identifier" &&
        callee.property.name === "provide"
      )
    }

    return {
      CallExpression(node) {
        if (!isLayerProvide(node)) return

        for (const arg of node.arguments) {
          if (isLayerProvide(arg)) {
            context.report({
              node: arg,
              messageId: "nestedProvide"
            })
          }
        }
      }
    }
  }
}

const localPlugin = {
  rules: {
    "no-disable-validation": noDisableValidationRule,
    "prefer-option-from-nullable": preferOptionFromNullableRule,
    "pipe-max-arguments": pipeMaxArgumentsRule,
    "no-nested-layer-provide": noNestedLayerProvideRule,
    "no-service-option": noServiceOptionRule,
    "no-void-expression": noVoidExpressionRule,
    "no-effect-ignore": noEffectIgnoreRule,
    "no-effect-catchallcause": noEffectCatchAllCauseRule,
    "no-effect-asvoid": noEffectAsVoidRule,
    "no-silent-error-swallow": noSilentErrorSwallowRule
  }
}

export default [
  {
    ignores: [
      // Build outputs
      "**/dist/**",
      "**/build/**",
      "**/.output/**",

      // Dependencies
      "**/node_modules/**",

      // Coverage
      "**/coverage/**",

      // Generated files
      "**/*.gen.ts",
      "**/*.gen.tsx",

      // Other
      "**/*.md",
      "repositories/**"
    ]
  },
  js.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module"
      }
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      local: localPlugin
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      // Ban disableValidation: true
      "local/no-disable-validation": "error",
      // Prefer Option.fromNullable over ternary
      "local/prefer-option-from-nullable": "error",
      // Error when .pipe() has too many arguments (max 20)
      "local/pipe-max-arguments": "error",
      // Error when Layer.provide is nested inside another Layer.provide
      "local/no-nested-layer-provide": "error",
      // Ban Effect.serviceOption - services should always be present in context
      "local/no-service-option": "error",
      // Ban void expressions - they are no-ops
      "local/no-void-expression": "error",
      // Ban Effect.ignore - errors should be explicitly handled
      "local/no-effect-ignore": "error",
      // Ban Effect.catchAllCause - it catches defects which should not be caught
      "local/no-effect-catchallcause": "error",
      // Ban Effect.asVoid - void already allows any value
      "local/no-effect-asvoid": "error",
      // Ban silently swallowing errors with () => Effect.void
      "local/no-silent-error-swallow": "error",
      // Allow unused variables starting with underscore
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_"
        }
      ],
      // Prohibit any and type assertions
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-assertions": [
        "error",
        {
          assertionStyle: "never"
        }
      ],
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-namespace": "off",
      // Effect pattern: export both Schema constant and Type type with same name
      "no-redeclare": "off",
      // Effect uses generator functions that may not have explicit yield
      "require-yield": "off",
      // Prefer const assertions
      "prefer-const": "error",
      // Consistent type imports
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports",
          fixStyle: "separate-type-imports"
        }
      ],
      // Object shorthand
      "object-shorthand": "error",
      // No fallthrough in switch cases
      "no-fallthrough": "off",
      // Disable no-undef for TypeScript (TypeScript handles this)
      "no-undef": "off"
    }
  },
  {
    files: ["packages/*/src/**/*.ts", "packages/*/src/**/*.tsx"],
    rules: {
      // Disallow console in source files
      "no-console": "error"
    }
  },
  {
    files: ["packages/*/test/**/*.ts", "packages/*/test/**/*.tsx"],
    rules: {
      // Allow console in tests
      "no-console": "off"
    }
  },
  // Apply Prettier config to disable conflicting rules
  prettierConfig
]
