import js from '@eslint/js'
import tseslint from 'typescript-eslint'
export default tseslint.config({ ignores: ['dist', 'backend/dist', 'deployment/**', 'scripts/**'] }, js.configs.recommended, ...tseslint.configs.recommended)
