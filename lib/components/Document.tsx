import * as React from 'react'

export interface DocumentProps {
  pageStyles: string[],
  pageScripts: string[],
  initialProps: any,
  publicPath: string,
  children?: React.ReactNode,
  helmet: any,
  body: string,
  pageName: string,
}

export default ({
  pageStyles,
  pageScripts,
  initialProps = {},
  publicPath,
  body,
  pageName,
  helmet
}: DocumentProps) => {

  const scripts = [...pageScripts]
  
  const main = scripts.pop()
  const vendors = scripts.pop()
  const page = scripts

  return (
    <html {...helmet.htmlAttributes.toComponent()}>
      <head>
        {helmet.title.toComponent()}
        {helmet.meta.toComponent()}
        {helmet.link.toComponent()}
        {pageStyles.map(url => {
          return <link key={url} rel='stylesheet' href={publicPath + url} />
        })}
        { <script src={publicPath + vendors}></script>}
        <script dangerouslySetInnerHTML={{
          __html: `
        window.__serlina__DATA = {};
        window.__serlina__DATA.pageInitialProps = ${JSON.stringify(initialProps)};
      `.replace(/\s/g, '')
        }}>
        </script>
      </head>
      <body {...helmet.bodyAttributes.toComponent()}>
        <div id="app" dangerouslySetInnerHTML={{ __html: body }} />
        { <script src={publicPath + page}></script> }
        { <script src={publicPath + main}></script>}
      </body>
    </html>
  )
}