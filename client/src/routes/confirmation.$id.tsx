import { createFileRoute } from '@tanstack/react-router'
import { ConfirmationPage } from '../pages/ConfirmationPage'

export const Route = createFileRoute('/confirmation/$id')({
  component: ConfirmationPage,
})
