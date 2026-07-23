import { lazy } from 'react'

export const MainPage = lazy(() => import(/* webpackChunkName: 'main' */'./main'))